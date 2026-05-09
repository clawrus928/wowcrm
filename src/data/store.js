import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, getStoredUser, getToken } from "./api.js";

const ENTITY_KEYS = [
  "leads",
  "customers",
  "contacts",
  "deals",
  "contracts",
  "quotes",
  "channels",
  "suppliers",
  "pricings",
];

const EMPTY_STATE = {
  leads: [],
  customers: [],
  contacts: [],
  deals: [],
  contracts: [],
  quotes: [],
  channels: [],
  suppliers: [],
  pricings: [],
};

export const DEMO_PASSWORD = "wowcrm";

export function useCrmStore() {
  const [data, setData] = useState(EMPTY_STATE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(() => {
    const stored = getStoredUser();
    return getToken() && stored ? stored.id : null;
  });
  const [currentUserName, setCurrentUserName] = useState(() => {
    const stored = getStoredUser();
    return getToken() && stored ? stored.name : null;
  });
  const refreshIdRef = useRef(0);

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setData(EMPTY_STATE);
      setLoading(false);
      return;
    }
    const myId = ++refreshIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const results = await Promise.all(ENTITY_KEYS.map((k) => api.list(k)));
      if (myId !== refreshIdRef.current) return; // stale
      const next = {};
      ENTITY_KEYS.forEach((k, i) => (next[k] = results[i]));
      setData(next);
    } catch (err) {
      if (err.status === 401) {
        // session expired, clear user
        setCurrentUser(null);
        setCurrentUserName(null);
        setData(EMPTY_STATE);
      } else {
        setError(err.message || "載入失敗");
      }
    } finally {
      if (myId === refreshIdRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentUser) refresh();
    else setLoading(false);
  }, [currentUser, refresh]);

  // ── Auth ────────────────────────────────────────────
  const login = useCallback(async (userId, password) => {
    try {
      const result = await api.login(userId, password);
      setCurrentUser(result.user.id);
      setCurrentUserName(result.user.name);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message || "登入失敗" };
    }
  }, []);

  const logout = useCallback(() => {
    api.logout();
    setCurrentUser(null);
    setCurrentUserName(null);
    setData(EMPTY_STATE);
  }, []);

  // ── CRUD with optimistic refresh ────────────────────
  const addItem = useCallback(async (entity, item) => {
    const created = await api.create(entity, item);
    setData((prev) => ({ ...prev, [entity]: [created, ...prev[entity]] }));
    return created;
  }, []);

  const updateItem = useCallback(async (entity, id, patch) => {
    const updated = await api.update(entity, id, patch);
    setData((prev) => ({
      ...prev,
      [entity]: prev[entity].map((x) => (x.id === id ? updated : x)),
    }));
    return updated;
  }, []);

  const removeItem = useCallback(async (entity, id) => {
    await api.remove(entity, id);
    setData((prev) => ({
      ...prev,
      [entity]: prev[entity].filter((x) => x.id !== id),
    }));
  }, []);

  const moveDealStage = useCallback(async (dealId, stage) => {
    const updated = await api.moveDealStage(dealId, stage);
    setData((prev) => ({
      ...prev,
      deals: prev.deals.map((d) => (d.id === dealId ? updated : d)),
    }));
  }, []);

  const convertLeadToCustomer = useCallback(async (leadId, customerInput) => {
    const { customer } = await api.convertLeadToCustomer(leadId, customerInput);
    // Refresh both leads (status changed) and customers (new one added)
    await refresh();
    return customer;
  }, [refresh]);

  const apiObj = useMemo(
    () => ({
      ...data,
      currentUser,
      currentUserName,
      loading,
      error,
      login,
      logout,
      refresh,
      addItem,
      updateItem,
      removeItem,
      moveDealStage,
      convertLeadToCustomer,
    }),
    [
      data,
      currentUser,
      currentUserName,
      loading,
      error,
      login,
      logout,
      refresh,
      addItem,
      updateItem,
      removeItem,
      moveDealStage,
      convertLeadToCustomer,
    ]
  );

  return apiObj;
}
