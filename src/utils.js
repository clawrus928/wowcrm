export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
}

export function todayStr() {
  return new Date().toISOString().split("T")[0];
}

export function nowStr() {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}

export function daysUntil(d) {
  if (!d) return null;
  const a = new Date(d), b = new Date();
  a.setHours(0, 0, 0, 0);
  b.setHours(0, 0, 0, 0);
  return Math.ceil((a - b) / 864e5);
}

export function fmtDate(d) {
  if (!d) return "";
  const x = new Date(d);
  return (x.getMonth() + 1) + "/" + x.getDate();
}
