import { useEffect, useState } from "react";
import { PRODUCTS, REPS } from "./constants.js";

export const fmt = (n, currency = "MOP") =>
  `${currency} ${Number(n || 0).toLocaleString()}`;

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

// Effective amount for a deal: explicit `amount` if the user set one,
// otherwise the sum of accepted quotes linked to this deal. Lets the user
// leave the deal amount blank and let it follow whatever the customer
// actually agreed to.
export function effectiveDealAmount(deal, quotes) {
  if (!deal) return 0;
  if (deal.amount != null && deal.amount !== "" && Number(deal.amount) > 0) {
    return Number(deal.amount);
  }
  const accepted = (quotes || []).filter(
    (q) => q.dealId === deal.id && q.status === "已接受"
  );
  if (accepted.length === 0) {
    // No accepted quote yet — fall back to the user-typed value (could be 0)
    return Number(deal.amount) || 0;
  }
  return accepted.reduce((sum, q) => sum + derivedAmount(q), 0);
}
export const getProduct = (id) => PRODUCTS.find((p) => p.id === id);
export const getRep = (id) => REPS.find((r) => r.id === id);
export const getCustomer = (id, customers) => customers.find((c) => c.id === id);
export const getDeal = (id, deals) => deals.find((d) => d.id === id);

export const today = () => new Date().toISOString().slice(0, 10);

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
