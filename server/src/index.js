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
  listEntity,
  listUsers,
  migrate,
  openDb,
  updateRecord,
} from "./db.js";

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
  const user = findUser(db, userId);
  if (!user) return reply.code(401).send({ error: "帳號不存在" });
  const ok = bcrypt.compareSync(password, user.password_hash);
  if (!ok) return reply.code(401).send({ error: "密碼不正確" });
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
    try {
      return createRecord(db, entity, id, { ...body, id });
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
    try {
      const created = createRecords(db, entity, prepared);
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
    return updateRecord(db, entity, req.params.id, req.body || {});
  });

  app.delete(`/api/${entity}/:id`, { preHandler: auth }, async (req, reply) => {
    const existing = getRecord(db, entity, req.params.id);
    if (!existing) return reply.code(404).send({ error: "Not found" });
    if (existing.owner && existing.owner !== req.user.sub && !req.user.isApiKey) {
      return reply.code(403).send({ error: "只有負責人可以刪除" });
    }
    deleteRecord(db, entity, req.params.id);
    return { ok: true };
  });
}

// ── Pipeline stage move (any logged-in user can drag) ──
app.post("/api/deals/:id/stage", { preHandler: auth }, async (req, reply) => {
  const existing = getRecord(db, "deals", req.params.id);
  if (!existing) return reply.code(404).send({ error: "Not found" });
  return updateRecord(db, "deals", req.params.id, { stage: req.body?.stage });
});

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
