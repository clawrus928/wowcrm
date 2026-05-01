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

    CREATE INDEX IF NOT EXISTS idx_records_entity ON records(entity);
    CREATE INDEX IF NOT EXISTS idx_records_owner ON records(owner);
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
