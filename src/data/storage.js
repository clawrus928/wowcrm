const KEY = "wowcrm:v1";
const AUTH_KEY = "wowcrm:auth";

export function loadFromStorage() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveToStorage(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // quota or private mode — silently ignore
  }
}

export function clearStorage() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

export function loadAuth() {
  try {
    return localStorage.getItem(AUTH_KEY) || null;
  } catch {
    return null;
  }
}

export function saveAuth(userId) {
  try {
    if (userId) localStorage.setItem(AUTH_KEY, userId);
    else localStorage.removeItem(AUTH_KEY);
  } catch {
    // ignore
  }
}
