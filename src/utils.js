import { useEffect, useState } from "react";
import { PRODUCTS, REPS } from "./constants.js";

export const fmt = (n) => `MOP ${Number(n || 0).toLocaleString()}`;

// Compute total amount for records that may carry either a flat `amount`
// (older quotes/contracts) or a `items: [{quantity, unitPrice}]` array.
export function derivedAmount(record) {
  if (!record) return 0;
  if (Array.isArray(record.items) && record.items.length > 0) {
    return record.items.reduce(
      (sum, it) =>
        sum + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0),
      0
    );
  }
  return Number(record.amount) || 0;
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
