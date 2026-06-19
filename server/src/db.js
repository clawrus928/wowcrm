import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

export const SEED_USERS = [
  { id: "u1", name: "Alan Leong" },
  { id: "u2", name: "Benson 文斌" },
  { id: "u3", name: "陈伏娟" },
  { id: "u4", name: "Cyrus" },
  { id: "u5", name: "Eason" },
  { id: "u6", name: "Tata" },
  { id: "u7", name: "Maggie Chim" },
  { id: "u8", name: "Kennedy" },
  { id: "u9", name: "杨家欣" },
  { id: "u10", name: "藍光" },
  { id: "u11", name: "李蔭良" },
];

export const ENTITIES = [
  "leads",
  "customers",
  "contacts",
  "deals",
  "contracts",
  "quotes",
  "channels",
  "suppliers",
  "pricings",
  "activities",
];

export function openDb(path) {
  mkdirSync(dirname(path), { recursive: true });
  const db = new Database(path);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  return db;
}

export function migrate(db, defaultPassword) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS records (
      id TEXT PRIMARY KEY,
      entity TEXT NOT NULL,
      data TEXT NOT NULL,
      owner TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts TEXT NOT NULL,
      actor TEXT,
      action TEXT NOT NULL,
      entity TEXT NOT NULL,
      record_id TEXT,
      changes TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_records_entity ON records(entity);
    CREATE INDEX IF NOT EXISTS idx_records_owner ON records(owner);
    CREATE INDEX IF NOT EXISTS idx_audit_record ON audit(entity, record_id);
    CREATE INDEX IF NOT EXISTS idx_audit_ts ON audit(ts);
  `);

  // Seed users on first run
  const userCount = db.prepare("SELECT COUNT(*) as n FROM users").get().n;
  if (userCount === 0) {
    const hash = bcrypt.hashSync(defaultPassword, 10);
    const insertUser = db.prepare(
      "INSERT INTO users (id, name, password_hash) VALUES (?, ?, ?)"
    );
    const tx = db.transaction(() => {
      for (const u of SEED_USERS) insertUser.run(u.id, u.name, hash);
    });
    tx();
  }
}

export function listEntity(db, entity) {
  const rows = db
    .prepare(
      "SELECT id, data, owner, created_at, updated_at FROM records WHERE entity = ? ORDER BY created_at DESC"
    )
    .all(entity);
  return rows.map(rowToRecord);
}

export function getRecord(db, entity, id) {
  const row = db
    .prepare(
      "SELECT id, data, owner, created_at, updated_at FROM records WHERE entity = ? AND id = ?"
    )
    .get(entity, id);
  return row ? rowToRecord(row) : null;
}

export function createRecord(db, entity, id, data) {
  const now = new Date().toISOString();
  db.prepare(
    "INSERT INTO records (id, entity, data, owner, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(id, entity, JSON.stringify(data), data.owner || null, now, now);
  return getRecord(db, entity, id);
}

// Bulk-create many records of one entity in a single transaction. Each item
// in `records` must already carry its own `id`. The whole batch commits or
// rolls back together — if any insert fails (e.g. duplicate id) nothing is
// written. Returns the freshly-stored records in input order.
export function createRecords(db, entity, records) {
  const now = new Date().toISOString();
  const insert = db.prepare(
    "INSERT INTO records (id, entity, data, owner, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
  );
  const tx = db.transaction((rows) => {
    for (const data of rows) {
      insert.run(data.id, entity, JSON.stringify(data), data.owner || null, now, now);
    }
  });
  tx(records);
  return records.map((d) => getRecord(db, entity, d.id));
}

export function updateRecord(db, entity, id, patch) {
  const existing = getRecord(db, entity, id);
  if (!existing) return null;
  const merged = { ...existing, ...patch, id: existing.id };
  const now = new Date().toISOString();
  db.prepare(
    "UPDATE records SET data = ?, owner = ?, updated_at = ? WHERE entity = ? AND id = ?"
  ).run(JSON.stringify(merged), merged.owner || null, now, entity, id);
  return getRecord(db, entity, id);
}

export function deleteRecord(db, entity, id) {
  const result = db
    .prepare("DELETE FROM records WHERE entity = ? AND id = ?")
    .run(entity, id);
  return result.changes > 0;
}

export function listUsers(db) {
  return db.prepare("SELECT id, name FROM users").all();
}

export function findUser(db, id) {
  return db
    .prepare("SELECT id, name, password_hash FROM users WHERE id = ?")
    .get(id);
}

function rowToRecord(row) {
  const data = JSON.parse(row.data);
  return { ...data, id: row.id, owner: row.owner ?? data.owner };
}

// ── Audit log ─────────────────────────────────────────
// Records who changed what, when. Auditing must NEVER break the underlying
// operation, so every write is wrapped in try/catch.

export function logAudit(db, { actor, action, entity, recordId, changes }) {
  try {
    db.prepare(
      "INSERT INTO audit (ts, actor, action, entity, record_id, changes) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(
      new Date().toISOString(),
      actor || null,
      action,
      entity,
      recordId || null,
      changes === undefined ? null : JSON.stringify(changes)
    );
  } catch {
    // swallow — never let auditing fail the real write
  }
}

export function logAuditMany(db, rows) {
  if (!Array.isArray(rows) || rows.length === 0) return;
  try {
    const now = new Date().toISOString();
    const stmt = db.prepare(
      "INSERT INTO audit (ts, actor, action, entity, record_id, changes) VALUES (?, ?, ?, ?, ?, ?)"
    );
    const tx = db.transaction((items) => {
      for (const r of items) {
        stmt.run(
          now,
          r.actor || null,
          r.action,
          r.entity,
          r.recordId || null,
          r.changes === undefined ? null : JSON.stringify(r.changes)
        );
      }
    });
    tx(rows);
  } catch {
    // swallow
  }
}

export function listAudit(db, { entity, recordId, limit = 100 } = {}) {
  const clauses = [];
  const params = [];
  if (entity) {
    clauses.push("entity = ?");
    params.push(entity);
  }
  if (recordId) {
    clauses.push("record_id = ?");
    params.push(recordId);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const lim = Math.min(Math.max(Number(limit) || 100, 1), 500);
  const rows = db
    .prepare(
      `SELECT id, ts, actor, action, entity, record_id AS recordId, changes
       FROM audit ${where} ORDER BY id DESC LIMIT ?`
    )
    .all(...params, lim);
  return rows.map((r) => ({
    ...r,
    changes: r.changes ? JSON.parse(r.changes) : null,
  }));
}
