import test from "node:test";
import assert from "node:assert/strict";
import Database from "better-sqlite3";
import { createRecord, findUser, getRecord, listUsers, migrate } from "./db.js";
import { mapLegacyOwners, OWNER_TEMPLATES } from "./legacy-owners.js";
import { recycleInactiveRecords } from "./pool.js";
import { REPS } from "../../src/constants.js";

function setup(t) {
  const db = new Database(":memory:");
  migrate(db, "test-only-password");
  t.after(() => db.close());
  return db;
}
const origin = (owner, pool = false) => ({
  sourceSetHash: "a".repeat(64), importFingerprint: "b".repeat(64),
  origin: { fields: { [pool ? "前负责人" : "负责人"]: owner } },
});
const add = (db, entity, id, patch = {}) => createRecord(db, entity, id, {
  id, name: id, owner: null, created: "2026-10-20T10:00:00+08:00", _legacy: origin("wodSyntheticA"), ...patch,
});

test("template labels agree with frontend and are excluded from login", t => {
  const db = setup(t);
  assert.deepEqual(REPS.filter(user => user.placeholder).map(({ id, name }) => ({ id, name })), OWNER_TEMPLATES);
  assert.equal(listUsers(db).length, 11);
  for (const { id } of OWNER_TEMPLATES) {
    assert.equal(findUser(db, id), undefined);
    assert.equal(db.prepare("SELECT login_enabled FROM users WHERE id = ?").get(id).login_enabled, 0);
  }
});

test("existing users table is upgraded while preserving passwords", t => {
  const db = new Database(":memory:");
  t.after(() => db.close());
  db.exec("CREATE TABLE users (id TEXT PRIMARY KEY, name TEXT NOT NULL, password_hash TEXT NOT NULL)");
  db.prepare("INSERT INTO users VALUES (?, ?, ?)").run("u4", "Cyrus", "existing-password-hash");
  migrate(db, "not-a-replacement-password");
  assert.equal(findUser(db, "u4").password_hash, "existing-password-hash");
  assert.equal(listUsers(db).length, 1);
});

test("maps blanks, historical owners and temporary holds, preserving actual pools", t => {
  const db = setup(t);
  add(db, "customers", "held", { inPool: true, previousOwner: "wodSyntheticA", poolTransferMethod: "舊負責人待對應" });
  add(db, "customers", "pool", { inPool: true, previousOwner: "wodSyntheticB", poolTransferMethod: "自動回收", _legacy: origin("wodSyntheticB", true) });
  for (const entity of ["contacts", "deals", "activities"]) add(db, entity, entity);
  const result = mapLegacyOwners(db);
  assert.equal(result.mappedOwners, 2);
  assert.equal(getRecord(db, "customers", "held").owner, "u12");
  assert.equal(getRecord(db, "customers", "held").inPool, false);
  const pool = getRecord(db, "customers", "pool");
  assert.equal(pool.owner, null);
  assert.equal(pool.inPool, true);
  assert.equal(pool.previousOwner, "u13");
  for (const entity of ["contacts", "deals", "activities"]) assert.equal(getRecord(db, entity, entity).owner, "u12");
  assert.equal(db.prepare("SELECT count(*) AS n FROM audit WHERE action = 'map_legacy_owner'").get().n, 5);
  assert.equal(mapLegacyOwners(db).changedRecords, 0);
  assert.equal(getRecord(db, "deals", "deals")._legacy.importFingerprint, "b".repeat(64));
});

test("preserves manual reassignment, claims and actual pool transfers", t => {
  const db = setup(t);
  add(db, "deals", "assigned", { owner: "u4" });
  add(db, "customers", "claimed", { owner: "u1", inPool: false, claimedAt: "2026-10-22T00:00:00Z" });
  add(db, "leads", "released", { inPool: true, previousOwner: "u2", poolTransferMethod: "手動轉入" });
  createRecord(db, "deals", "manual", { id: "manual", owner: null, legacyOwner: "wodSyntheticA" });
  mapLegacyOwners(db);
  assert.equal(getRecord(db, "deals", "assigned").owner, "u4");
  assert.equal(getRecord(db, "customers", "claimed").owner, "u1");
  assert.equal(getRecord(db, "leads", "released").owner, null);
  assert.equal(getRecord(db, "leads", "released").previousOwner, "u2");
  assert.equal(getRecord(db, "deals", "manual").owner, null);
});

test("persistent mapping stays stable as later imports add older IDs", t => {
  const db = setup(t);
  add(db, "deals", "later-alphabet", { _legacy: origin("wodSyntheticZ") });
  mapLegacyOwners(db);
  add(db, "deals", "earlier-alphabet", { _legacy: origin("wodSyntheticA") });
  mapLegacyOwners(db);
  assert.equal(getRecord(db, "deals", "later-alphabet").owner, "u12");
  assert.equal(getRecord(db, "deals", "earlier-alphabet").owner, "u13");
});

test("restoring an assigned owner does not reset 30-day recycling", t => {
  const db = setup(t);
  add(db, "customers", "stale", { inPool: true, poolTransferMethod: "舊負責人待對應", previousOwner: "wodSyntheticA", created: "2026-01-01T00:00:00Z" });
  mapLegacyOwners(db);
  assert.equal(recycleInactiveRecords(db, new Date("2026-10-22T00:00:00Z")), 1);
  const record = getRecord(db, "customers", "stale");
  assert.equal(record.owner, null);
  assert.equal(record.previousOwner, "u12");
  assert.equal(record.claimedAt, undefined);
});

test("an unexpected sixth owner rolls back record edits and mappings", t => {
  const db = setup(t);
  for (let i = 0; i < 6; i++) add(db, "deals", `deal${i}`, { _legacy: origin(`wodSynthetic${i}`) });
  assert.throws(() => mapLegacyOwners(db), /More than five/);
  assert.equal(db.prepare("SELECT count(*) AS n FROM legacy_owner_mappings").get().n, 0);
  assert.equal(db.prepare("SELECT count(*) AS n FROM records WHERE owner IS NOT NULL").get().n, 0);
});
