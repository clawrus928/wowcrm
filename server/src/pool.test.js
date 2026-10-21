import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRecord, getRecord, migrate, openDb } from "./db.js";
import { recycleInactiveRecords } from "./pool.js";

test("recycles after 30 days without a completed follow-up", () => {
  const dir = mkdtempSync(join(tmpdir(), "wowcrm-pool-"));
  const db = openDb(join(dir, "test.db"));
  try {
    migrate(db, "local-test-only");
    const created = "2026-08-01";
    for (const id of ["stale", "recent", "planned", "claimed", "converted"]) {
      createRecord(db, "leads", id, {
        id, name: id, owner: "u1", created,
        ...(id === "claimed" ? { claimedAt: "2026-10-10T00:00:00Z" } : {}),
        ...(id === "converted" ? { status: "已轉客戶" } : {}),
      });
    }
    createRecord(db, "activities", "done", {
      id: "done", relatedType: "lead", relatedId: "recent", done: true, date: "2026-10-10",
    });
    createRecord(db, "activities", "todo", {
      id: "todo", relatedType: "lead", relatedId: "planned", done: false, date: "2026-10-20",
    });
    const count = recycleInactiveRecords(db, new Date("2026-10-21T00:00:00Z"));
    assert.equal(count, 2);
    for (const id of ["stale", "planned"]) {
      const record = getRecord(db, "leads", id);
      assert.equal(record.inPool, true);
      assert.equal(record.owner, null);
      assert.equal(record.previousOwner, "u1");
    }
    for (const id of ["recent", "claimed", "converted"]) {
      assert.notEqual(getRecord(db, "leads", id).inPool, true);
    }
    assert.equal(recycleInactiveRecords(db, new Date("2026-10-21T00:00:00Z")), 0);

    createRecord(db, "customers", "boundary", {
      id: "boundary", name: "boundary", owner: "u2", created: "2026-09-21",
    });
    createRecord(db, "customers", "imported-follow-up", {
      id: "imported-follow-up", name: "imported-follow-up", owner: "u2",
      created: "2026-08-01", lastFollowUpAt: "2026-10-10 09:00",
    });
    assert.equal(recycleInactiveRecords(db, new Date("2026-10-21T00:00:00Z")), 1);
    assert.equal(getRecord(db, "customers", "boundary").inPool, true);
    assert.notEqual(getRecord(db, "customers", "imported-follow-up").inPool, true);
  } finally {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
