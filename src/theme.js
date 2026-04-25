export const C = {
  bg: "#FAF9F7", bgAlt: "#FFFFFF", bgSb: "#F5F4F0", bgCard: "#FFFFFF",
  bgHover: "#F0EFEB", border: "#E8E5DE", borderL: "#EEEDEA",
  text: "#1A1915", textS: "#6B6760", textM: "#9C9891",
  accent: "#C96442", accentBg: "#FDF5F2", accentL: "#F0DCD4",
  danger: "#C53D3D", dangerBg: "#FDF2F2",
};

export const STATUS = {
  todo: { label: "待辦", color: "#7C7A73", bg: "#F0EFEB", dot: "#A8A59E" },
  "in-progress": { label: "進行中", color: "#B8860B", bg: "#FFF8E7", dot: "#DAA520" },
  done: { label: "完成", color: "#2D8659", bg: "#EDF7F0", dot: "#3CB371" },
  blocked: { label: "阻塞", color: "#C53D3D", bg: "#FDF2F2", dot: "#E06060" },
};

export const PRIO = {
  high: { label: "高", color: "#C53D3D", icon: "▲" },
  medium: { label: "中", color: "#B8860B", icon: "◆" },
  low: { label: "低", color: "#9C9891", icon: "▽" },
};

export const ROLES = {
  admin: { label: "管理員", color: "#C96442" },
  manager: { label: "負責人", color: "#4A7DC7" },
  member: { label: "成員", color: "#3C9E6E" },
  viewer: { label: "觀察者", color: "#9C9891" },
};

export const PCOLS = ["#C96442", "#4A7DC7", "#7B5EA7", "#C76E8A", "#3C9E6E", "#C9962A", "#3E9BB8", "#C54545"];
export const TAGS = ["Dev", "Design", "Marketing", "Strategy", "Bug", "Research", "Content", "Admin"];

export const inp = {
  width: "100%", padding: "10px 14px", borderRadius: 10, fontSize: 14,
  border: "1px solid " + C.border, background: "#fff", color: C.text,
  outline: "none", boxSizing: "border-box", fontFamily: "inherit",
};
