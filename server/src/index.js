import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import staticPlugin from "@fastify/static";
import bcrypt from "bcryptjs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { existsSync } from "node:fs";
import {
  ENTITIES,
  createRecord,
  createRecords,
  deleteRecord,
  findUser,
  getRecord,
  listAudit,
  listEntity,
  listUsers,
  logAudit,
  logAuditMany,
  migrate,
  openDb,
  updateRecord,
} from "./db.js";
import { validateRecord, isValidStage } from "./validate.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.PORT || 8080);
const HOST = process.env.HOST || "0.0.0.0";
const DB_PATH = process.env.DB_PATH || "/data/wowcrm.db";
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const DEFAULT_PASSWORD = process.env.DEFAULT_PASSWORD || "wowcrm";
const API_KEY = process.env.API_KEY || "";
const STATIC_DIR = process.env.STATIC_DIR || resolve(__dirname, "../../dist");

const ID_PREFIX = {
  leads: "l",
  customers: "c",
  contacts: "ct",
  deals: "d",
  contracts: "k",
  quotes: "q",
  channels: "ch",
  suppliers: "sp",
  pricings: "pr",
};

function newId(entity) {
  const prefix = ID_PREFIX[entity] || "x";
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

// ── 登入限流 ───────────────────────────────────────────
// 服務在 nginx 後面,req.ip 全是 127.0.0.1,所以按「帳號」限流而非 IP
// (否則會整個辦公室共用一個 IP 被一起鎖死)。純記憶體、無依賴。
const LOGIN_MAX_FAILS = 8; // 視窗內最多錯幾次
const LOGIN_WINDOW_MS = 10 * 60 * 1000; // 計次視窗 10 分鐘
const LOGIN_BLOCK_MS = 10 * 60 * 1000; // 觸發後封鎖 10 分鐘
const loginAttempts = new Map(); // userId -> { fails, firstAt, blockedUntil }

function loginBlockedSeconds(userId) {
  const rec = loginAttempts.get(userId);
  if (rec?.blockedUntil > Date.now()) {
    return Math.ceil((rec.blockedUntil - Date.now()) / 1000);
  }
  return 0;
}
function recordLoginFail(userId) {
  const now = Date.now();
  let rec = loginAttempts.get(userId);
  if (!rec || now - rec.firstAt > LOGIN_WINDOW_MS) {
    rec = { fails: 0, firstAt: now, blockedUntil: 0 };
  }
  rec.fails += 1;
  if (rec.fails >= LOGIN_MAX_FAILS) rec.blockedUntil = now + LOGIN_BLOCK_MS;
  loginAttempts.set(userId, rec);
  // 輕量防膨脹:超過上限時清掉已過期的紀錄
  if (loginAttempts.size > 2000) {
    for (const [k, v] of loginAttempts) {
      if (v.blockedUntil < now && now - v.firstAt > LOGIN_WINDOW_MS) loginAttempts.delete(k);
    }
  }
}
function clearLoginFail(userId) {
  loginAttempts.delete(userId);
}

const db = openDb(DB_PATH);
migrate(db, DEFAULT_PASSWORD);

const app = Fastify({ logger: { level: "info" } });
await app.register(cors, { origin: true });
await app.register(jwt, { secret: JWT_SECRET });

// Auth middleware. Supports two modes:
// 1. JWT Bearer token (from /api/auth/login)
// 2. API key via X-API-Key header (for agent / automation use — admin mode,
//    bypasses per-user ownership checks)
const auth = async (req, reply) => {
  // API key path — admin, no user scoping
  const apiKey = req.headers["x-api-key"];
  if (apiKey && API_KEY && apiKey === API_KEY) {
    req.user = { sub: "api", name: "API Agent", isApiKey: true };
    return;
  }
  try {
    await req.jwtVerify();
  } catch {
    return reply.code(401).send({ error: "Unauthorized" });
  }
};

// ── Health ─────────────────────────────────────────────
app.get("/api/health", async () => ({ ok: true, ts: new Date().toISOString() }));

// ── Auth ───────────────────────────────────────────────
app.get("/api/auth/users", async () => listUsers(db));

app.post("/api/auth/login", async (req, reply) => {
  const { userId, password } = req.body || {};
  if (!userId || !password) return reply.code(400).send({ error: "Missing credentials" });
  const wait = loginBlockedSeconds(userId);
  if (wait > 0) {
    return reply
      .code(429)
      .send({ error: `嘗試次數過多，請約 ${Math.ceil(wait / 60)} 分鐘後再試` });
  }
  const user = findUser(db, userId);
  if (!user) {
    recordLoginFail(userId);
    return reply.code(401).send({ error: "帳號不存在" });
  }
  const ok = bcrypt.compareSync(password, user.password_hash);
  if (!ok) {
    recordLoginFail(userId);
    return reply.code(401).send({ error: "密碼不正確" });
  }
  clearLoginFail(userId);
  const token = app.jwt.sign({ sub: user.id, name: user.name }, { expiresIn: "30d" });
  return { token, user: { id: user.id, name: user.name } };
});

app.get("/api/auth/me", { preHandler: auth }, async (req) => ({
  id: req.user.sub,
  name: req.user.name,
}));

// ── CRUD per entity ───────────────────────────────────
// Permission model B: any logged-in user can read; PATCH/DELETE only by owner
for (const entity of ENTITIES) {
  app.get(`/api/${entity}`, { preHandler: auth }, async () => listEntity(db, entity));

  app.get(`/api/${entity}/:id`, { preHandler: auth }, async (req, reply) => {
    const r = getRecord(db, entity, req.params.id);
    if (!r) return reply.code(404).send({ error: "Not found" });
    return r;
  });

  app.post(`/api/${entity}`, { preHandler: auth }, async (req, reply) => {
    const body = req.body || {};
    const id = body.id || newId(entity);
    if (!body.owner) body.owner = req.user.sub;
    if (!body.created) body.created = new Date().toISOString().slice(0, 10);
    const errors = validateRecord(entity, body, { partial: false });
    if (errors.length) return reply.code(400).send({ error: errors.join("；") });
    try {
      const created = createRecord(db, entity, id, { ...body, id });
      logAudit(db, { actor: req.user.sub, action: "create", entity, recordId: id, changes: created });
      return created;
    } catch (err) {
      app.log.error(err);
      return reply.code(400).send({ error: "Create failed" });
    }
  });

  // Bulk import — one transaction, all-or-nothing. Accepts either a raw
  // array body or { items: [...] }. Same per-item defaults as single POST
  // (auto id / owner / created). Static "bulk" segment is matched ahead of
  // the ":id" param routes, so there's no collision.
  app.post(`/api/${entity}/bulk`, { preHandler: auth }, async (req, reply) => {
    const body = req.body || {};
    const items = Array.isArray(body) ? body : body.items;
    if (!Array.isArray(items) || items.length === 0) {
      return reply.code(400).send({ error: "items 必須是非空陣列" });
    }
    if (items.length > 500) {
      return reply.code(400).send({ error: "單次最多匯入 500 筆" });
    }
    const today = new Date().toISOString().slice(0, 10);
    const prepared = items.map((it) => {
      const data = { ...it };
      data.id = data.id || newId(entity);
      if (!data.owner) data.owner = req.user.sub;
      if (!data.created) data.created = today;
      return data;
    });
    // Validate the whole batch BEFORE the transaction — nothing is written
    // unless every item passes.
    const problems = [];
    prepared.forEach((it, i) => {
      const errs = validateRecord(entity, it, { partial: false });
      if (errs.length) problems.push(`第 ${i + 1} 筆：${errs.join("、")}`);
    });
    if (problems.length) {
      return reply
        .code(400)
        .send({ error: "批次驗證失敗（未寫入任何資料）", details: problems.slice(0, 20) });
    }
    try {
      const created = createRecords(db, entity, prepared);
      logAuditMany(
        db,
        created.map((r) => ({
          actor: req.user.sub,
          action: "bulk_create",
          entity,
          recordId: r.id,
          changes: r,
        }))
      );
      return { count: created.length, created };
    } catch (err) {
      app.log.error(err);
      return reply.code(400).send({ error: "批次匯入失敗（已全部回滾）" });
    }
  });

  app.patch(`/api/${entity}/:id`, { preHandler: auth }, async (req, reply) => {
    const existing = getRecord(db, entity, req.params.id);
    if (!existing) return reply.code(404).send({ error: "Not found" });
    if (existing.owner && existing.owner !== req.user.sub && !req.user.isApiKey) {
      return reply.code(403).send({ error: "只有負責人可以修改" });
    }
    const patch = req.body || {};
    const errors = validateRecord(entity, patch, { partial: true });
    if (errors.length) return reply.code(400).send({ error: errors.join("；") });
    const updated = updateRecord(db, entity, req.params.id, patch);
    logAudit(db, { actor: req.user.sub, action: "update", entity, recordId: req.params.id, changes: patch });
    return updated;
  });

  app.delete(`/api/${entity}/:id`, { preHandler: auth }, async (req, reply) => {
    const existing = getRecord(db, entity, req.params.id);
    if (!existing) return reply.code(404).send({ error: "Not found" });
    if (existing.owner && existing.owner !== req.user.sub && !req.user.isApiKey) {
      return reply.code(403).send({ error: "只有負責人可以刪除" });
    }
    deleteRecord(db, entity, req.params.id);
    // Store the deleted snapshot so an accidental delete can be recovered.
    logAudit(db, { actor: req.user.sub, action: "delete", entity, recordId: req.params.id, changes: existing });
    return { ok: true };
  });
}

// ── Pipeline stage move (any logged-in user can drag) ──
app.post("/api/deals/:id/stage", { preHandler: auth }, async (req, reply) => {
  const existing = getRecord(db, "deals", req.params.id);
  if (!existing) return reply.code(404).send({ error: "Not found" });
  const stage = req.body?.stage;
  if (!stage) return reply.code(400).send({ error: "缺少 stage" });
  if (!isValidStage(existing.product, stage)) {
    return reply.code(400).send({ error: `stage「${stage}」不屬於產品線 ${existing.product}` });
  }
  const updated = updateRecord(db, "deals", req.params.id, { stage });
  logAudit(db, {
    actor: req.user.sub,
    action: "stage",
    entity: "deals",
    recordId: req.params.id,
    changes: { from: existing.stage, to: stage },
  });
  return updated;
});

// ── Audit log read (any logged-in user / API key) ─────
// 過濾：?entity=customers&recordId=c_xxx&limit=100（limit 上限 500）
app.get("/api/_audit", { preHandler: auth }, async (req) =>
  listAudit(db, {
    entity: req.query.entity,
    recordId: req.query.recordId,
    limit: req.query.limit,
  })
);

// ── Lead → Customer conversion ────────────────────────
app.post("/api/leads/:id/convert", { preHandler: auth }, async (req, reply) => {
  const lead = getRecord(db, "leads", req.params.id);
  if (!lead) return reply.code(404).send({ error: "Not found" });
  const customerInput = req.body || {};
  if (lead.channelId && !customerInput.channelId) {
    customerInput.channelId = lead.channelId;
  }
  const today = new Date().toISOString().slice(0, 10);
  const customerOwner = customerInput.owner || lead.owner || req.user.sub;
  const customerId = newId("customers");
  const customer = createRecord(db, "customers", customerId, {
    ...customerInput,
    id: customerId,
    owner: customerOwner,
    created: today,
  });

  // Auto-create a Contact from the lead's contact info so the
  // person we originally talked to isn't lost.
  let contact = null;
  if (lead.name?.trim() || lead.phone?.trim()) {
    const contactId = newId("contacts");
    contact = createRecord(db, "contacts", contactId, {
      id: contactId,
      customerId,
      name: lead.name || "",
      role: "",
      phone: lead.phone || "",
      email: "",
      owner: customerOwner,
      collaborators: [],
      created: today,
    });
  }

  updateRecord(db, "leads", lead.id, {
    status: "已轉客戶",
    convertedCustomerId: customerId,
  });
  logAuditMany(db, [
    { actor: req.user.sub, action: "create", entity: "customers", recordId: customerId, changes: customer },
    ...(contact ? [{ actor: req.user.sub, action: "create", entity: "contacts", recordId: contact.id, changes: contact }] : []),
    { actor: req.user.sub, action: "convert", entity: "leads", recordId: lead.id, changes: { convertedCustomerId: customerId } },
  ]);
  return { customer, contact };
});

// ── Static frontend ────────────────────────────────────
if (existsSync(STATIC_DIR)) {
  await app.register(staticPlugin, {
    root: STATIC_DIR,
    prefix: "/",
  });
  app.setNotFoundHandler((req, reply) => {
    if (req.raw.url?.startsWith("/api/")) return reply.code(404).send({ error: "Not found" });
    return reply.sendFile("index.html");
  });
} else {
  app.log.warn(`Static dir not found: ${STATIC_DIR} — only API will be served`);
}

try {
  await app.listen({ port: PORT, host: HOST });
  app.log.info(`wowcrm server listening on ${HOST}:${PORT}, db=${DB_PATH}, static=${STATIC_DIR}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
