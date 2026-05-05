// API client. Same-origin by default; override with VITE_API_URL at build time.
const BASE = import.meta.env.VITE_API_URL || "";

const TOKEN_KEY = "wowcrm:token";
const USER_KEY = "wowcrm:user";

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setSession(token, user) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  } catch {
    // ignore quota or private mode errors
  }
}

async function call(path, { method = "GET", body, auth = true } = {}) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) {
    setSession(null, null);
    throw new ApiError("登入已過期", 401);
  }
  let data = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  if (!res.ok) {
    const msg = (data && data.error) || `HTTP ${res.status}`;
    throw new ApiError(msg, res.status);
  }
  return data;
}

export const api = {
  // auth
  listUsers: () => call("/auth/users", { auth: false }),
  login: async (userId, password) => {
    const result = await call("/auth/login", {
      method: "POST",
      body: { userId, password },
      auth: false,
    });
    setSession(result.token, result.user);
    return result;
  },
  logout: () => setSession(null, null),
  me: () => call("/auth/me"),

  // entities
  list: (entity) => call(`/${entity}`),
  get: (entity, id) => call(`/${entity}/${id}`),
  create: (entity, body) => call(`/${entity}`, { method: "POST", body }),
  update: (entity, id, patch) => call(`/${entity}/${id}`, { method: "PATCH", body: patch }),
  remove: (entity, id) => call(`/${entity}/${id}`, { method: "DELETE" }),

  // pipeline / conversion
  moveDealStage: (dealId, stage) =>
    call(`/deals/${dealId}/stage`, { method: "POST", body: { stage } }),
  convertLeadToCustomer: (leadId, customerInput) =>
    call(`/leads/${leadId}/convert`, { method: "POST", body: customerInput }),
};
