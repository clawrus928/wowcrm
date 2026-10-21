import { randomBytes } from "node:crypto";

// Assignment labels, deliberately excluded from login. No source user IDs are
// embedded in code; the mapping is discovered from private import provenance.
export const OWNER_TEMPLATES = [
  { id: "u12", name: "A" },
  { id: "u13", name: "B" },
  { id: "u14", name: "C" },
  { id: "u15", name: "D" },
  { id: "u16", name: "E" },
];

const isLegacyId = value => typeof value === "string" && /^wod[\w-]+$/.test(value);

export function mapLegacyOwners(db, now = new Date().toISOString()) {
  const run = db.transaction(() => {
    for (const template of OWNER_TEMPLATES) {
      const existing = db.prepare("SELECT name, login_enabled FROM users WHERE id = ?").get(template.id);
      if (existing && (existing.name !== template.name || existing.login_enabled !== 0)) {
        throw new Error(`Owner template ID ${template.id} is already in use`);
      }
      if (!existing) {
        db.prepare("INSERT INTO users (id, name, password_hash, login_enabled) VALUES (?, ?, ?, 0)")
          .run(template.id, template.name, `!disabled-owner-template:${randomBytes(32).toString("hex")}`);
      }
    }

    const imported = db.prepare("SELECT id, entity, data, owner FROM records").all().flatMap(row => {
      const data = JSON.parse(row.data);
      if (!/^[a-f0-9]{64}$/.test(data._legacy?.sourceSetHash || "") || !data._legacy?.origin?.fields) return [];
      return [{ ...row, data, source: data._legacy.origin.fields }];
    });
    const mappings = new Map(db.prepare("SELECT legacy_id, user_id FROM legacy_owner_mappings").all()
      .map(row => [row.legacy_id, row.user_id]));
    const legacyIds = [...new Set(imported.flatMap(({ source }) =>
      [source["负责人"], source["前负责人"]].filter(isLegacyId)))].sort();
    for (const legacyId of legacyIds) {
      if (mappings.has(legacyId)) continue;
      const used = new Set(mappings.values());
      const template = OWNER_TEMPLATES.find(user => !used.has(user.id));
      if (!template) throw new Error("More than five legacy owners require additional assignment templates");
      db.prepare("INSERT INTO legacy_owner_mappings (legacy_id, user_id, created_at) VALUES (?, ?, ?)")
        .run(legacyId, template.id, now);
      mappings.set(legacyId, template.id);
    }

    const update = db.prepare("UPDATE records SET data = ?, owner = ?, updated_at = ? WHERE id = ?");
    const audit = db.prepare("INSERT INTO audit (ts, actor, action, entity, record_id, changes) VALUES (?, ?, ?, ?, ?, ?)");
    let changed = 0;
    for (const row of imported) {
      const data = row.data;
      const before = { owner: row.owner ?? data.owner ?? null, previousOwner: data.previousOwner ?? null, inPool: !!data.inPool };
      data.owner = before.owner;
      const originalOwner = mappings.get(row.source["负责人"]);
      if (mappings.has(data.previousOwner)) data.previousOwner = mappings.get(data.previousOwner);

      // A temporary hold caused solely by the missing owner mapping can be
      // resolved. Preserve actual pool transfers, manual claims and edits.
      if (["customers", "leads"].includes(row.entity)) {
        if (originalOwner && !data.owner && data.inPool && data.poolTransferMethod === "舊負責人待對應") {
          data.inPool = false;
          data.owner = originalOwner;
          data.poolTransferMethod = "舊負責人已對應";
        } else if (originalOwner && !data.owner && !data.inPool) {
          data.owner = originalOwner;
        }
      } else if (["contacts", "deals", "activities"].includes(row.entity) && originalOwner && !data.owner) {
        data.owner = originalOwner;
      }
      const after = { owner: data.owner ?? null, previousOwner: data.previousOwner ?? null, inPool: !!data.inPool };
      if (JSON.stringify(before) === JSON.stringify(after)) continue;
      data._legacy.ownerMappedAt = now;
      update.run(JSON.stringify(data), data.owner || null, now, row.id);
      audit.run(now, "legacy-owner-migration", "map_legacy_owner", row.entity, row.id, JSON.stringify({ before, after }));
      changed += 1;
    }
    return { mappedOwners: mappings.size, changedRecords: changed };
  });
  return run.immediate();
}
