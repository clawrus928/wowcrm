const KEY = "wowcrm:v1";

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
