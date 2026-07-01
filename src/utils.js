import { useEffect, useState } from "react";
import { PRODUCTS, REPS } from "./constants.js";

export const fmt = (n, currency = "MOP") =>
  `${currency} ${Number(n || 0).toLocaleString()}`;

// ── Multi-currency aggregation ───────────────────────────
// We have no FX rates, so summing MOP + HKD + RMB into one number is wrong.
// Instead, group sums by currency and render them side by side.
// sumByCurrency → Map<currency, total>.
export function sumByCurrency(list, amountFn, currencyFn) {
  const map = new Map();
  for (const item of list || []) {
    const cur = currencyFn(item) || "MOP";
    map.set(cur, (map.get(cur) || 0) + (Number(amountFn(item)) || 0));
  }
  return map;
}

// Render a currency→amount Map as "MOP 1,200,000 · RMB 80,000". Zero buckets
// are dropped; an all-empty map renders as "MOP 0" (or `dashWhenEmpty`).
export function fmtMulti(map, { dashWhenEmpty = false } = {}) {
  const parts = [];
  for (const [cur, amt] of map) {
    if (amt) parts.push(fmt(amt, cur));
  }
  if (parts.length === 0) return dashWhenEmpty ? "—" : fmt(0);
  return parts.join(" · ");
}

// Compute total amount for records that may carry either a flat `amount`
// (older quotes/contracts) or a `items: [{quantity, unitPrice, discountPct?}]`
// + optional `addOns: [{kind, amount}]` array.
export function derivedAmount(record) {
  if (!record) return 0;
  if (Array.isArray(record.items) && record.items.length > 0) {
    return quoteBreakdown(record).total;
  }
  return Number(record.amount) || 0;
}

// Full breakdown of a record with line items + optional add-ons. Returns
// every intermediate number so the UI can show 原價 → 折扣 → 小計 → 加值費 → 總承諾.
//
// addOn shape: { id, name, kind: "discount" | "fee", amount: number }
//   - "discount" → amount is a percentage of (subtotal - lineDiscount)
//   - "fee"      → amount is an absolute MOP value, added to totalCommitment only
export function quoteBreakdown(record) {
  const items = Array.isArray(record?.items) ? record.items : [];
  const addOns = Array.isArray(record?.addOns) ? record.addOns : [];

  let subtotal = 0;
  let lineDiscount = 0;
  let totalCost = 0;
  for (const it of items) {
    const qty = Number(it.quantity) || 0;
    const price = Number(it.unitPrice) || 0;
    const cost = Number(it.cost) || 0;
    const pct = Math.max(0, Math.min(100, Number(it.discountPct) || 0));
    const gross = qty * price;
    subtotal += gross;
    lineDiscount += gross * (pct / 100);
    totalCost += qty * cost;
  }
  const afterLineDiscount = subtotal - lineDiscount;

  let addOnDiscount = 0;
  let addOnFee = 0;
  for (const a of addOns) {
    const amt = Number(a.amount) || 0;
    if (a.kind === "fee") {
      addOnFee += amt;
    } else {
      addOnDiscount += afterLineDiscount * (amt / 100);
    }
  }

  const total = Math.max(0, afterLineDiscount - addOnDiscount);
  const totalCommitment = total + addOnFee;
  const margin = total - totalCost;

  return {
    subtotal,
    lineDiscount,
    afterLineDiscount,
    addOnDiscount,
    addOnFee,
    total,
    totalCommitment,
    totalCost,
    margin,
  };
}

// For a given pricing catalog item + quantity, return the best matching
// tier discount (highest minQty <= qty). Returns 0 if no tiers / no match.
export function suggestTierDiscount(pricing, quantity) {
  const tiers = pricing?.tiers || [];
  const qty = Number(quantity) || 0;
  let best = 0;
  for (const t of tiers) {
    const min = Number(t.minQty) || 0;
    if (qty >= min && Number(t.discountPct) > best) {
      best = Number(t.discountPct);
    }
  }
  return best;
}

// ── Lookup / index helpers ───────────────────────────────
// Build these once per render (useMemo) and pass into row renderers so list
// views stop doing O(rows × records) `.filter()` scans on every render.

// Map keyed by a derived value → array of items.
export function groupBy(list, keyFn) {
  const map = new Map();
  for (const item of list || []) {
    const k = keyFn(item);
    const bucket = map.get(k);
    if (bucket) bucket.push(item);
    else map.set(k, [item]);
  }
  return map;
}

// Map of id → item.
export function indexById(list, key = "id") {
  const map = new Map();
  for (const item of list || []) map.set(item[key], item);
  return map;
}

// Map of dealId → summed derivedAmount over its 已接受 quotes. Only deals that
// HAVE an accepted quote get an entry, which preserves effectiveDealAmount's
// fall-back semantics exactly.
export function acceptedQuoteSums(quotes) {
  const map = new Map();
  for (const q of quotes || []) {
    if (q.status === "已接受" && q.dealId != null) {
      map.set(q.dealId, (map.get(q.dealId) || 0) + derivedAmount(q));
    }
  }
  return map;
}

// Effective deal amount using a precomputed accepted-sum map (O(1) lookup).
export function dealAmount(deal, acceptedSums) {
  if (!deal) return 0;
  if (deal.amount != null && deal.amount !== "" && Number(deal.amount) > 0) {
    return Number(deal.amount);
  }
  return acceptedSums.has(deal.id) ? acceptedSums.get(deal.id) : Number(deal.amount) || 0;
}

// Effective amount for a deal: explicit `amount` if the user set one,
// otherwise the sum of accepted quotes linked to this deal. Lets the user
// leave the deal amount blank and let it follow whatever the customer
// actually agreed to. (Convenience wrapper — for hot loops build the map
// once with acceptedQuoteSums() and call dealAmount() instead.)
export function effectiveDealAmount(deal, quotes) {
  return dealAmount(deal, acceptedQuoteSums(quotes));
}
export const getProduct = (id) => PRODUCTS.find((p) => p.id === id);
export const getRep = (id) => REPS.find((r) => r.id === id);
export const getCustomer = (id, customers) => customers.find((c) => c.id === id);
export const getDeal = (id, deals) => deals.find((d) => d.id === id);

export const today = () => new Date().toISOString().slice(0, 10);

// 某筆紀錄的「下次跟進日」= 未完成跟進中最早的日期(無則 null)。
export function nextFollowUp(activities, relatedType, relatedId) {
  let best = null;
  for (const a of activities || []) {
    if (
      a.relatedType === relatedType &&
      a.relatedId === relatedId &&
      !a.done &&
      a.date
    ) {
      if (!best || a.date < best) best = a.date;
    }
  }
  return best;
}

export const newId = (prefix) =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export function useIsMobile(bp = 800) {
  const [m, setM] = useState(typeof window !== "undefined" && window.innerWidth < bp);
  useEffect(() => {
    const h = () => setM(window.innerWidth < bp);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, [bp]);
  return m;
}
