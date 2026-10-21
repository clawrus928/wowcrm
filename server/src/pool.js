import { listEntity, logAudit, updateRecord } from "./db.js";

export const RECYCLE_AFTER_DAYS = 30;

function timestamp(value) {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : null;
}

// Only completed activities count as follow-up. A planned task does not reset
// the inactivity clock. Imported latest-follow-up dates are also respected.
export function recycleInactiveRecords(db, now = new Date()) {
  const cutoff = now.getTime() - RECYCLE_AFTER_DAYS * 24 * 60 * 60 * 1000;
  const latestActivity = new Map();
  for (const activity of listEntity(db, "activities")) {
    if (!activity.done || !["lead", "customer"].includes(activity.relatedType)) continue;
    const time = timestamp(activity.completedAt || activity.date);
    if (time === null) continue;
    const key = `${activity.relatedType}:${activity.relatedId}`;
    latestActivity.set(key, Math.max(time, latestActivity.get(key) ?? -Infinity));
  }

  let recycled = 0;
  for (const [entity, relatedType] of [["leads", "lead"], ["customers", "customer"]]) {
    for (const record of listEntity(db, entity)) {
      if (record.inPool || !record.owner || record.status === "已轉客戶" || record.convertedCustomerId) continue;
      const last = Math.max(
        timestamp(record.created) ?? -Infinity,
        timestamp(record.lastFollowUpAt) ?? -Infinity,
        latestActivity.get(`${relatedType}:${record.id}`) ?? -Infinity,
        timestamp(record.claimedAt) ?? -Infinity,
      );
      if (!Number.isFinite(last) || last > cutoff) continue;
      updateRecord(db, entity, record.id, {
        inPool: true,
        owner: null,
        previousOwner: record.owner,
        poolEnteredAt: now.toISOString(),
        poolTransferMethod: "自動回收",
      });
      logAudit(db, { actor: null, action: "auto_recycle", entity, recordId: record.id,
        changes: { previousOwner: record.owner, lastFollowUpAt: new Date(last).toISOString() } });
      recycled += 1;
    }
  }
  return recycled;
}
