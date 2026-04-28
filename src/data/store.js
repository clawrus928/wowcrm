import { useCallback, useEffect, useMemo, useState } from "react";
import {
  SEED_LEADS,
  SEED_CUSTOMERS,
  SEED_CONTACTS,
  SEED_DEALS,
  SEED_CONTRACTS,
  SEED_QUOTES,
  SEED_CHANNELS,
  SEED_SUPPLIERS,
} from "./seed.js";
import { loadAuth, loadFromStorage, saveAuth, saveToStorage, clearStorage } from "./storage.js";
import { REPS } from "../constants.js";

export const DEMO_PASSWORD = "wowcrm";
import { newId, today } from "../utils.js";

const DEFAULT_STATE = {
  leads: SEED_LEADS,
  customers: SEED_CUSTOMERS,
  contacts: SEED_CONTACTS,
  deals: SEED_DEALS,
  contracts: SEED_CONTRACTS,
  quotes: SEED_QUOTES,
  channels: SEED_CHANNELS,
  suppliers: SEED_SUPPLIERS,
};

const ENTITY_KEYS = ["leads", "customers", "contacts", "deals", "contracts", "quotes", "channels", "suppliers"];

const LEAD_STATUS_MIGRATION = {
  "未處理": "未接觸",
  "初訪": "已約訪",
  "跟進中": "已約訪",
  "報價": "已約訪",
  "無效": "流失",
};

function migrateLead(lead) {
  const next = LEAD_STATUS_MIGRATION[lead.status];
  return next ? { ...lead, status: next } : lead;
}
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

export function useCrmStore() {
  const [state, setState] = useState(() => {
    const persisted = typeof window !== "undefined" ? loadFromStorage() : null;
    if (!persisted) return DEFAULT_STATE;
    const merged = { ...DEFAULT_STATE };
    for (const k of ENTITY_KEYS) {
      if (Array.isArray(persisted[k])) merged[k] = persisted[k];
    }
    merged.leads = merged.leads.map(migrateLead);
    return merged;
  });

  const [currentUser, setCurrentUser] = useState(() => {
    if (typeof window === "undefined") return null;
    const id = loadAuth();
    return id && REPS.some((r) => r.id === id) ? id : null;
  });

  const login = useCallback((userId, password) => {
    if (password !== DEMO_PASSWORD) return { ok: false, error: "密碼不正確" };
    if (!REPS.some((r) => r.id === userId)) return { ok: false, error: "帳號不存在" };
    setCurrentUser(userId);
    saveAuth(userId);
    return { ok: true };
  }, []);

  const logout = useCallback(() => {
    setCurrentUser(null);
    saveAuth(null);
  }, []);

  useEffect(() => {
    saveToStorage(state);
  }, [state]);

  const addItem = useCallback((entity, item) => {
    const id = item.id || newId(ID_PREFIX[entity] || "x");
    const created = item.created || today();
    const record = { ...item, id, created };
    setState((prev) => ({ ...prev, [entity]: [record, ...prev[entity]] }));
    return record;
  }, []);

  const updateItem = useCallback((entity, id, patch) => {
    setState((prev) => ({
      ...prev,
      [entity]: prev[entity].map((x) => (x.id === id ? { ...x, ...patch } : x)),
    }));
  }, []);

  const removeItem = useCallback((entity, id) => {
    setState((prev) => ({ ...prev, [entity]: prev[entity].filter((x) => x.id !== id) }));
  }, []);

  const moveDealStage = useCallback((dealId, stage) => {
    setState((prev) => ({
      ...prev,
      deals: prev.deals.map((d) => (d.id === dealId ? { ...d, stage } : d)),
    }));
  }, []);

  const convertLeadToCustomer = useCallback(
    (leadId, customerInput) => {
      const newCustomer = {
        ...customerInput,
        id: newId(ID_PREFIX.customers),
        created: today(),
      };
      setState((prev) => {
        const lead = prev.leads.find((l) => l.id === leadId);
        if (lead?.channelId && !newCustomer.channelId) {
          newCustomer.channelId = lead.channelId;
        }
        return {
          ...prev,
          customers: [newCustomer, ...prev.customers],
          leads: prev.leads.map((l) =>
            l.id === leadId ? { ...l, status: "已轉客戶", convertedCustomerId: newCustomer.id } : l
          ),
        };
      });
      return newCustomer;
    },
    []
  );

  const resetAll = useCallback(() => {
    clearStorage();
    setState(DEFAULT_STATE);
  }, []);

  const api = useMemo(
    () => ({
      ...state,
      currentUser,
      login,
      logout,
      addItem,
      updateItem,
      removeItem,
      moveDealStage,
      convertLeadToCustomer,
      resetAll,
    }),
    [
      state,
      currentUser,
      login,
      logout,
      addItem,
      updateItem,
      removeItem,
      moveDealStage,
      convertLeadToCustomer,
      resetAll,
    ]
  );

  return api;
}
