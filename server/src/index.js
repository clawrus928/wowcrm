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

const auth = async (req, reply) => {
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

  app.patch(`/api/${entity}/:id`, { preHandler: auth }, async (req, reply) => {
    const existing = getRecord(db, entity, req.params.id);
    if (!existing) return reply.code(404).send({ error: "Not found" });
    if (existing.owner && existing.owner !== req.user.sub) {
      return reply.code(403).send({ error: "只有負責人可以修改" });
    }
    return updateRecord(db, entity, req.params.id, req.body || {});
  });

  app.delete(`/api/${entity}/:id`, { preHandler: auth }, async (req, reply) => {
    const existing = getRecord(db, entity, req.params.id);
    if (!existing) return reply.code(404).send({ error: "Not found" });
    if (existing.owner && existing.owner !== req.user.sub) {
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
  const customerId = newId("customers");
  const customer = createRecord(db, "customers", customerId, {
    ...customerInput,
    id: customerId,
    owner: customerInput.owner || lead.owner || req.user.sub,
    created: new Date().toISOString().slice(0, 10),
  });
  updateRecord(db, "leads", lead.id, {
    status: "已轉客戶",
    convertedCustomerId: customerId,
  });
  return { customer };
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
