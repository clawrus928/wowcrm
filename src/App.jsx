import { useState, useEffect, useMemo } from "react";

// ═══════════════════════════════════════════════════════
// DESIGN TOKENS
// ═══════════════════════════════════════════════════════
const T = {
  bg: "#FAFAF9", surface: "#FFFFFF", surfaceAlt: "#F5F4F2",
  border: "#E8E5E0", borderLight: "#F0EEEA",
  text: "#1C1917", textSecondary: "#78716C", textTertiary: "#A8A29E",
  accent: "#D97706", accentBg: "#FEF3C7", accentText: "#92400E",
  font: "'Noto Sans TC', 'Source Han Sans TC', system-ui, sans-serif",
  mono: "'DM Mono', 'SF Mono', monospace",
  radius: 8, radiusSm: 5,
};

const PRODUCTS = [
  { id: "consulting", name: "顧問服務", color: "#2563EB", icon: "◆",
    stages: ["需求分析", "提案中", "執行中", "驗收中", "已完成"] },
  { id: "hardware", name: "硬體設備", color: "#059669", icon: "⬢",
    stages: ["報價中", "採購中", "出貨中", "安裝中", "已交付"] },
  { id: "marketing", name: "行銷服務", color: "#D97706", icon: "△",
    stages: ["需求確認", "策略規劃", "執行中", "成效追蹤", "已結案"] },
];

const INDUSTRIES = ["科技", "金融", "零售", "製造", "餐飲", "醫療", "教育", "貿易", "其他"];
const LEAD_STATUSES = ["未處理", "初訪", "跟進中", "報價", "已轉客戶", "無效"];
const LEAD_SOURCES = ["官網", "轉介紹", "電話開發", "展覽", "社群媒體", "廣告", "其他"];
const DEAL_STATUSES = ["進行中", "已成交", "已流失"];
const CONTRACT_STATUSES = ["草稿", "審批中", "已簽署", "執行中", "已完成", "已終止"];
const QUOTE_STATUSES = ["草稿", "已發送", "已接受", "已拒絕", "已過期"];
const REPS = [
  { id: "u1", name: "林柏宏" }, { id: "u2", name: "陳怡君" },
  { id: "u3", name: "張志豪" }, { id: "u4", name: "王雅婷" },
];
const CURRENT_USER = "u1";

// ─── Mock Data ───
const LEADS = [
  { id: "l1", name: "莊麗雲", company: "康健生活藥房", phone: "6633-3221", status: "未處理", source: "官網", owner: "u1", collaborators: [], created: "2026-03-16" },
  { id: "l2", name: "李錦添", company: "李錦記廚房", phone: "6630-0993", status: "未處理", source: "官網", owner: "u2", collaborators: ["u1"], created: "2026-03-16" },
  { id: "l3", name: "吳秀芳", company: "唯一專業美容", phone: "6633-0055", status: "初訪", source: "轉介紹", owner: "u1", collaborators: [], created: "2026-03-16" },
  { id: "l4", name: "雷少芳", company: "烏佬茶寮美食", phone: "6303-3383", status: "跟進中", source: "展覽", owner: "u3", collaborators: [], created: "2026-02-11" },
  { id: "l5", name: "劉美華", company: "RUBY BOUTIQUE", phone: "6688-8866", status: "報價", source: "社群媒體", owner: "u1", collaborators: ["u4"], created: "2026-02-11" },
  { id: "l6", name: "梁家駒", company: "比竹面", phone: "6666-5304", status: "未處理", source: "電話開發", owner: "u4", collaborators: [], created: "2026-02-11" },
  { id: "l7", name: "張燦泳", company: "7星國際食品", phone: "6630-3339", status: "初訪", source: "廣告", owner: "u2", collaborators: ["u3"], created: "2026-02-11" },
  { id: "l8", name: "陳鎮濤", company: "源生藥房", phone: "6869-8484", status: "跟進中", source: "官網", owner: "u1", collaborators: [], created: "2026-02-10" },
];

const CUSTOMERS = [
  { id: "c1", name: "鴻海精密", corpGroup: "鴻海集團", industry: "科技", address: "新北市土城區", owner: "u1", collaborators: ["u3"], status: "初訪", source: "轉介紹", created: "2026-02-15" },
  { id: "c2", name: "群創光電", corpGroup: "鴻海集團", industry: "科技", address: "苗栗縣竹南鎮", owner: "u3", collaborators: [], status: "跟進中", source: "展覽", created: "2026-03-01" },
  { id: "c3", name: "台積電", corpGroup: null, industry: "科技", address: "新竹市科學園區", owner: "u1", collaborators: ["u2"], status: "報價", source: "官網", created: "2026-01-20" },
  { id: "c4", name: "國泰金控", corpGroup: "國泰集團", industry: "金融", address: "台北市信義區", owner: "u2", collaborators: [], status: "初訪", source: "電話開發", created: "2026-03-20" },
  { id: "c5", name: "統一超商", corpGroup: "統一集團", industry: "零售", address: "台北市松山區", owner: "u1", collaborators: ["u3", "u4"], status: "跟進中", source: "轉介紹", created: "2026-02-28" },
  { id: "c6", name: "聯發科", corpGroup: null, industry: "科技", address: "新竹市科學園區", owner: "u4", collaborators: ["u2"], status: "報價", source: "展覽", created: "2026-03-10" },
  { id: "c7", name: "佳爵食坊", corpGroup: null, industry: "餐飲", address: "澳門氹仔", owner: "u2", collaborators: [], status: "初訪", source: "官網", created: "2026-03-26" },
  { id: "c8", name: "光大數碼科技", corpGroup: null, industry: "零售", address: "澳門皇朝區", owner: "u1", collaborators: [], status: "報價", source: "廣告", created: "2026-03-23" },
];

const DEALS = [
  { id: "d1", title: "智慧工廠顧問", customerId: "c1", product: "consulting", stage: "執行中", amount: 1800000, status: "進行中", owner: "u1", collaborators: ["u2"], created: "2026-03-01" },
  { id: "d2", title: "產線設備升級", customerId: "c1", product: "hardware", stage: "出貨中", amount: 5200000, status: "進行中", owner: "u3", collaborators: [], created: "2026-02-15" },
  { id: "d3", title: "製程最佳化顧問", customerId: "c3", product: "consulting", stage: "提案中", amount: 2400000, status: "進行中", owner: "u1", collaborators: [], created: "2026-03-10" },
  { id: "d4", title: "僱主品牌行銷", customerId: "c3", product: "marketing", stage: "執行中", amount: 980000, status: "進行中", owner: "u4", collaborators: ["u1"], created: "2026-02-20" },
  { id: "d5", title: "POS 系統更新", customerId: "c5", product: "hardware", stage: "安裝中", amount: 1200000, status: "進行中", owner: "u3", collaborators: ["u1"], created: "2026-02-28" },
  { id: "d6", title: "數位轉型顧問", customerId: "c4", product: "consulting", stage: "需求分析", amount: 1500000, status: "進行中", owner: "u2", collaborators: [], created: "2026-03-20" },
  { id: "d7", title: "全球品牌推廣", customerId: "c6", product: "marketing", stage: "需求確認", amount: 1100000, status: "進行中", owner: "u4", collaborators: ["u2"], created: "2026-03-22" },
  { id: "d8", title: "AI 策略諮詢", customerId: "c3", product: "consulting", stage: "已完成", amount: 680000, status: "已成交", owner: "u1", collaborators: [], created: "2025-12-10" },
];

const CONTACTS = [
  { id: "ct1", customerId: "c1", name: "陳小華", role: "IT 總監", phone: "02-2268-5678", email: "chen@foxconn.com", owner: "u1", collaborators: [], created: "2026-02-15" },
  { id: "ct2", customerId: "c1", name: "劉建志", role: "採購經理", phone: "02-2268-9012", email: "liu@foxconn.com", owner: "u1", collaborators: ["u3"], created: "2026-02-15" },
  { id: "ct3", customerId: "c3", name: "王大明", role: "VP Engineering", phone: "03-563-1234", email: "wang@tsmc.com", owner: "u1", collaborators: ["u2"], created: "2026-01-20" },
  { id: "ct4", customerId: "c5", name: "黃建民", role: "營運長", phone: "02-2747-8901", email: "huang@7-11.com", owner: "u1", collaborators: [], created: "2026-02-28" },
  { id: "ct5", customerId: "c6", name: "林志偉", role: "CTO", phone: "03-567-8901", email: "lin@mediatek.com", owner: "u4", collaborators: ["u2"], created: "2026-03-10" },
  { id: "ct6", customerId: "c3", name: "李芳如", role: "採購主管", phone: "03-563-5678", email: "li@tsmc.com", owner: "u2", collaborators: [], created: "2026-01-22" },
  { id: "ct7", customerId: "c4", name: "張美玲", role: "數位長", phone: "02-2326-9012", email: "chang@cathay.com", owner: "u2", collaborators: [], created: "2026-03-20" },
  { id: "ct8", customerId: "c7", name: "李國強", role: "店長", phone: "6628-1234", email: "li@jueju.com", owner: "u2", collaborators: [], created: "2026-03-26" },
];

const CONTRACTS = [
  { id: "k1", title: "鴻海智慧工廠顧問合同", customerId: "c1", dealId: "d1", amount: 1800000, status: "執行中", signDate: "2026-03-10", startDate: "2026-03-15", endDate: "2026-09-15", owner: "u1", collaborators: ["u2"], created: "2026-03-08" },
  { id: "k2", title: "鴻海產線設備採購合同", customerId: "c1", dealId: "d2", amount: 5200000, status: "已簽署", signDate: "2026-02-28", startDate: "2026-03-01", endDate: "2026-06-30", owner: "u3", collaborators: [], created: "2026-02-25" },
  { id: "k3", title: "台積電 AI 策略諮詢合同", customerId: "c3", dealId: "d8", amount: 680000, status: "已完成", signDate: "2025-12-15", startDate: "2025-12-20", endDate: "2026-03-20", owner: "u1", collaborators: [], created: "2025-12-12" },
  { id: "k4", title: "統一超商 POS 安裝合同", customerId: "c5", dealId: "d5", amount: 1200000, status: "執行中", signDate: "2026-03-05", startDate: "2026-03-10", endDate: "2026-06-10", owner: "u3", collaborators: ["u1"], created: "2026-03-03" },
  { id: "k5", title: "國泰金控顧問合同", customerId: "c4", dealId: "d6", amount: 1500000, status: "草稿", signDate: null, startDate: null, endDate: null, owner: "u2", collaborators: [], created: "2026-03-25" },
];

const QUOTES = [
  { id: "q1", title: "鴻海設備報價 - Phase 2", customerId: "c1", dealId: "d2", amount: 3800000, status: "已發送", validUntil: "2026-04-30", owner: "u3", collaborators: [], created: "2026-03-20" },
  { id: "q2", title: "台積電顧問服務報價", customerId: "c3", dealId: "d3", amount: 2400000, status: "草稿", validUntil: "2026-05-15", owner: "u1", collaborators: [], created: "2026-03-22" },
  { id: "q3", title: "聯發科品牌行銷報價", customerId: "c6", dealId: "d7", amount: 1100000, status: "已發送", validUntil: "2026-04-20", owner: "u4", collaborators: ["u2"], created: "2026-03-24" },
  { id: "q4", title: "群創光電設備報價", customerId: "c2", dealId: "d3", amount: 3400000, status: "已接受", validUntil: "2026-04-10", owner: "u3", collaborators: [], created: "2026-03-15" },
  { id: "q5", title: "統一企業行銷方案報價", customerId: "c5", dealId: null, amount: 750000, status: "已過期", validUntil: "2026-03-01", owner: "u4", collaborators: [], created: "2026-02-15" },
  { id: "q6", title: "國泰金控數位轉型報價", customerId: "c4", dealId: "d6", amount: 1500000, status: "已發送", validUntil: "2026-04-25", owner: "u2", collaborators: [], created: "2026-03-26" },
];

// ═══════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════
const fmt = (n) => `NT$ ${n.toLocaleString()}`;
const getProduct = (id) => PRODUCTS.find((p) => p.id === id);
const getRep = (id) => REPS.find((r) => r.id === id);
const getCustomer = (id, customers) => customers.find((c) => c.id === id);

function useIsMobile(bp = 800) {
  const [m, setM] = useState(window.innerWidth < bp);
  useEffect(() => { const h = () => setM(window.innerWidth < bp); window.addEventListener("resize", h); return () => window.removeEventListener("resize", h); }, [bp]);
  return m;
}

// ═══════════════════════════════════════════════════════
// SHARED COMPONENTS
// ═══════════════════════════════════════════════════════
const s = { // style helpers
  badge: (color, bg) => ({
    display: "inline-flex", padding: "1px 8px", borderRadius: 4, fontSize: 11,
    fontWeight: 600, color: color || T.textSecondary, background: bg || T.surfaceAlt,
    fontFamily: T.font, whiteSpace: "nowrap", lineHeight: "20px",
  }),
  th: { padding: "10px 14px", textAlign: "left", fontSize: 12, fontWeight: 600, color: T.textTertiary, fontFamily: T.font, borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap", letterSpacing: 0.3, position: "sticky", top: 0, background: T.surface, zIndex: 1 },
  td: { padding: "10px 14px", fontSize: 13, color: T.text, fontFamily: T.font, borderBottom: `1px solid ${T.borderLight}`, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 200 },
  tdMono: { padding: "10px 14px", fontSize: 12, color: T.textSecondary, fontFamily: T.mono, borderBottom: `1px solid ${T.borderLight}`, whiteSpace: "nowrap" },
  link: { color: T.accent, cursor: "pointer", fontWeight: 500, textDecoration: "none" },
  input: { width: "100%", padding: "8px 12px", border: `1.5px solid ${T.border}`, borderRadius: T.radiusSm, fontSize: 14, color: T.text, fontFamily: T.font, outline: "none", background: T.surface, boxSizing: "border-box", WebkitAppearance: "none" },
  select: { padding: "6px 10px", border: `1.5px solid ${T.border}`, borderRadius: T.radiusSm, fontSize: 12, color: T.textSecondary, fontFamily: T.font, background: T.surface, cursor: "pointer", outline: "none" },
  btn: (primary) => ({
    padding: primary ? "8px 18px" : "6px 14px", borderRadius: T.radiusSm, border: primary ? "none" : `1.5px solid ${T.border}`,
    background: primary ? T.accent : T.surface, color: primary ? "#fff" : T.textSecondary,
    fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: T.font, whiteSpace: "nowrap",
    display: "inline-flex", alignItems: "center", gap: 4,
  }),
};

function StatusBadge({ status }) {
  const map = {
    "未處理": ["#6B7280", "#F3F4F6"], "初訪": ["#D97706", "#FEF3C7"],
    "跟進中": ["#2563EB", "#DBEAFE"], "報價": ["#7C3AED", "#EDE9FE"],
    "已轉客戶": ["#059669", "#D1FAE5"], "無效": ["#DC2626", "#FEE2E2"],
    "進行中": ["#2563EB", "#DBEAFE"], "已成交": ["#059669", "#D1FAE5"], "已流失": ["#DC2626", "#FEE2E2"],
    "草稿": ["#6B7280", "#F3F4F6"], "審批中": ["#D97706", "#FEF3C7"], "已簽署": ["#2563EB", "#DBEAFE"],
    "執行中": ["#7C3AED", "#EDE9FE"], "已完成": ["#059669", "#D1FAE5"], "已終止": ["#DC2626", "#FEE2E2"],
    "已發送": ["#2563EB", "#DBEAFE"], "已接受": ["#059669", "#D1FAE5"], "已拒絕": ["#DC2626", "#FEE2E2"], "已過期": ["#6B7280", "#E5E7EB"],
  };
  const [c, bg] = map[status] || ["#6B7280", "#F3F4F6"];
  return <span style={s.badge(c, bg)}>{status}</span>;
}

function OwnerTabs({ active, onChange }) {
  const tabs = [
    { id: "all", label: "全部" },
    { id: "mine", label: "我負責的" },
    { id: "collab", label: "我協作的" },
  ];
  return (
    <div style={{ display: "flex", gap: 0, borderBottom: `2px solid ${T.borderLight}` }}>
      {tabs.map((t) => (
        <button key={t.id} onClick={() => onChange(t.id)} style={{
          padding: "10px 18px", border: "none", background: "none", cursor: "pointer",
          fontSize: 13, fontWeight: active === t.id ? 700 : 500, fontFamily: T.font,
          color: active === t.id ? T.accent : T.textSecondary,
          borderBottom: active === t.id ? `2px solid ${T.accent}` : "2px solid transparent",
          marginBottom: -2, transition: "all .15s",
        }}>{t.label}</button>
      ))}
    </div>
  );
}

function FilterRow({ children }) {
  return (
    <div style={{
      display: "flex", gap: 8, padding: "10px 16px", flexWrap: "wrap", alignItems: "center",
      borderBottom: `1px solid ${T.borderLight}`, background: T.surfaceAlt,
    }}>{children}</div>
  );
}

function DataTable({ columns, data, onRowClick, emptyText }) {
  return (
    <div style={{ flex: 1, overflowY: "auto", overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
        <thead>
          <tr>{columns.map((c) => <th key={c.key} style={s.th}>{c.label}</th>)}</tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr><td colSpan={columns.length} style={{ ...s.td, textAlign: "center", padding: 40, color: T.textTertiary }}>{emptyText || "暫無資料"}</td></tr>
          ) : data.map((row, i) => (
            <tr key={row.id || i} onClick={() => onRowClick?.(row)} style={{ cursor: onRowClick ? "pointer" : "default", transition: "background .1s" }}
              onMouseEnter={(e) => e.currentTarget.style.background = T.surfaceAlt}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
              {columns.map((c) => (
                <td key={c.key} style={c.mono ? s.tdMono : s.td}>{c.render ? c.render(row) : row[c.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PageHeader({ title, count, onAdd, addLabel }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", borderBottom: `1px solid ${T.borderLight}` }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: T.text, fontFamily: T.font }}>{title}</h2>
        {count !== undefined && <span style={{ fontSize: 12, color: T.textTertiary, fontFamily: T.mono }}>{count} 筆</span>}
      </div>
      {onAdd && <button onClick={onAdd} style={s.btn(true)}>＋ {addLabel || "新增"}</button>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// LEADS VIEW
// ═══════════════════════════════════════════════════════
function LeadsView({ leads }) {
  const [tab, setTab] = useState("all");
  const [fStatus, setFStatus] = useState("all");
  const [fSource, setFSource] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let d = leads;
    if (tab === "mine") d = d.filter((x) => x.owner === CURRENT_USER);
    if (tab === "collab") d = d.filter((x) => x.collaborators.includes(CURRENT_USER));
    if (fStatus !== "all") d = d.filter((x) => x.status === fStatus);
    if (fSource !== "all") d = d.filter((x) => x.source === fSource);
    if (search) d = d.filter((x) => x.name.includes(search) || x.company.includes(search));
    return d;
  }, [leads, tab, fStatus, fSource, search]);

  const columns = [
    { key: "name", label: "姓名", render: (r) => <span style={s.link}>{r.name}</span> },
    { key: "company", label: "商戶名稱" },
    { key: "phone", label: "手機", mono: true },
    { key: "status", label: "跟進狀態", render: (r) => <StatusBadge status={r.status} /> },
    { key: "source", label: "線索來源" },
    { key: "owner", label: "負責人", render: (r) => getRep(r.owner)?.name || "—" },
    { key: "created", label: "創建時間", mono: true },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <PageHeader title="線索" count={filtered.length} addLabel="新增線索" onAdd={() => {}} />
      <OwnerTabs active={tab} onChange={setTab} />
      <FilterRow>
        <select style={s.select} value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
          <option value="all">跟進狀態：全部</option>
          {LEAD_STATUSES.map((x) => <option key={x} value={x}>{x}</option>)}
        </select>
        <select style={s.select} value={fSource} onChange={(e) => setFSource(e.target.value)}>
          <option value="all">線索來源：全部</option>
          {LEAD_SOURCES.map((x) => <option key={x} value={x}>{x}</option>)}
        </select>
        <div style={{ marginLeft: "auto" }}>
          <input style={{ ...s.input, width: 200, padding: "6px 10px", fontSize: 12 }} placeholder="搜尋姓名/商戶名稱" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </FilterRow>
      <DataTable columns={columns} data={filtered} emptyText="找不到符合條件的線索" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// CUSTOMERS VIEW
// ═══════════════════════════════════════════════════════
function CustomersView({ customers }) {
  const [tab, setTab] = useState("all");
  const [fIndustry, setFIndustry] = useState("all");
  const [fStatus, setFStatus] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let d = customers;
    if (tab === "mine") d = d.filter((x) => x.owner === CURRENT_USER);
    if (tab === "collab") d = d.filter((x) => x.collaborators.includes(CURRENT_USER));
    if (fIndustry !== "all") d = d.filter((x) => x.industry === fIndustry);
    if (fStatus !== "all") d = d.filter((x) => x.status === fStatus);
    if (search) d = d.filter((x) => x.name.includes(search) || (x.corpGroup || "").includes(search));
    return d;
  }, [customers, tab, fIndustry, fStatus, search]);

  const columns = [
    { key: "name", label: "商戶名稱", render: (r) => <span style={s.link}>{r.name}</span> },
    { key: "industry", label: "所屬行業" },
    { key: "corpGroup", label: "集團", render: (r) => r.corpGroup ? <span style={s.badge("#7C3AED", "#EDE9FE")}>{r.corpGroup}</span> : <span style={{ color: T.textTertiary }}>—</span> },
    { key: "status", label: "跟進狀態", render: (r) => <StatusBadge status={r.status} /> },
    { key: "source", label: "客戶來源" },
    { key: "owner", label: "負責人", render: (r) => getRep(r.owner)?.name || "—" },
    { key: "created", label: "創建時間", mono: true },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <PageHeader title="客戶" count={filtered.length} addLabel="新增客戶" onAdd={() => {}} />
      <OwnerTabs active={tab} onChange={setTab} />
      <FilterRow>
        <select style={s.select} value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
          <option value="all">跟進狀態：全部</option>
          {LEAD_STATUSES.slice(0, 4).map((x) => <option key={x} value={x}>{x}</option>)}
        </select>
        <select style={s.select} value={fIndustry} onChange={(e) => setFIndustry(e.target.value)}>
          <option value="all">所屬行業：全部</option>
          {INDUSTRIES.map((x) => <option key={x} value={x}>{x}</option>)}
        </select>
        <div style={{ marginLeft: "auto" }}>
          <input style={{ ...s.input, width: 200, padding: "6px 10px", fontSize: 12 }} placeholder="搜尋商戶名稱/集團" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </FilterRow>
      <DataTable columns={columns} data={filtered} emptyText="找不到符合條件的客戶" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// DEALS VIEW
// ═══════════════════════════════════════════════════════
function DealsView({ deals, customers }) {
  const [tab, setTab] = useState("all");
  const [fProduct, setFProduct] = useState("all");
  const [fStatus, setFStatus] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let d = deals;
    if (tab === "mine") d = d.filter((x) => x.owner === CURRENT_USER);
    if (tab === "collab") d = d.filter((x) => x.collaborators.includes(CURRENT_USER));
    if (fProduct !== "all") d = d.filter((x) => x.product === fProduct);
    if (fStatus !== "all") d = d.filter((x) => x.status === fStatus);
    if (search) d = d.filter((x) => x.title.includes(search) || (getCustomer(x.customerId, customers)?.name || "").includes(search));
    return d;
  }, [deals, customers, tab, fProduct, fStatus, search]);

  const columns = [
    { key: "title", label: "商機名稱", render: (r) => <span style={s.link}>{r.title}</span> },
    { key: "customer", label: "關聯客戶", render: (r) => getCustomer(r.customerId, customers)?.name || "—" },
    { key: "product", label: "產品線", render: (r) => {
      const p = getProduct(r.product);
      return p ? <span style={s.badge(p.color, `${p.color}14`)}>{p.icon} {p.name}</span> : "—";
    }},
    { key: "stage", label: "階段", render: (r) => {
      const p = getProduct(r.product);
      return <span style={s.badge(p?.color || "#666", `${p?.color || "#666"}14`)}>{r.stage}</span>;
    }},
    { key: "amount", label: "金額", mono: true, render: (r) => <span style={{ fontWeight: 600, color: T.text }}>{fmt(r.amount)}</span> },
    { key: "status", label: "狀態", render: (r) => <StatusBadge status={r.status} /> },
    { key: "owner", label: "負責人", render: (r) => getRep(r.owner)?.name || "—" },
    { key: "created", label: "創建時間", mono: true },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <PageHeader title="商機" count={filtered.length} addLabel="新增商機" onAdd={() => {}} />
      <OwnerTabs active={tab} onChange={setTab} />
      <FilterRow>
        <select style={s.select} value={fProduct} onChange={(e) => setFProduct(e.target.value)}>
          <option value="all">產品線：全部</option>
          {PRODUCTS.map((p) => <option key={p.id} value={p.id}>{p.icon} {p.name}</option>)}
        </select>
        <select style={s.select} value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
          <option value="all">狀態：全部</option>
          {DEAL_STATUSES.map((x) => <option key={x} value={x}>{x}</option>)}
        </select>
        <div style={{ marginLeft: "auto" }}>
          <input style={{ ...s.input, width: 200, padding: "6px 10px", fontSize: 12 }} placeholder="搜尋商機名稱/客戶" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </FilterRow>
      <DataTable columns={columns} data={filtered} emptyText="找不到符合條件的商機" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// CONTACTS VIEW
// ═══════════════════════════════════════════════════════
function ContactsView({ contacts, customers }) {
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let d = contacts;
    if (tab === "mine") d = d.filter((x) => x.owner === CURRENT_USER);
    if (tab === "collab") d = d.filter((x) => x.collaborators.includes(CURRENT_USER));
    if (search) d = d.filter((x) => x.name.includes(search) || (getCustomer(x.customerId, customers)?.name || "").includes(search) || x.email.toLowerCase().includes(search.toLowerCase()));
    return d;
  }, [contacts, customers, tab, search]);

  const columns = [
    { key: "name", label: "姓名", render: (r) => <span style={s.link}>{r.name}</span> },
    { key: "customer", label: "商戶名稱", render: (r) => getCustomer(r.customerId, customers)?.name || "—" },
    { key: "role", label: "職位" },
    { key: "phone", label: "座機", mono: true },
    { key: "email", label: "Email", mono: true },
    { key: "owner", label: "負責人", render: (r) => getRep(r.owner)?.name || "—" },
    { key: "created", label: "創建時間", mono: true },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <PageHeader title="聯系人" count={filtered.length} addLabel="新增聯系人" onAdd={() => {}} />
      <OwnerTabs active={tab} onChange={setTab} />
      <FilterRow>
        <div style={{ marginLeft: "auto" }}>
          <input style={{ ...s.input, width: 220, padding: "6px 10px", fontSize: 12 }} placeholder="搜尋姓名/商戶/Email" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </FilterRow>
      <DataTable columns={columns} data={filtered} emptyText="找不到符合條件的聯系人" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// CONTRACTS VIEW
// ═══════════════════════════════════════════════════════
function ContractsView({ contracts, customers }) {
  const [tab, setTab] = useState("all");
  const [fStatus, setFStatus] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let d = contracts;
    if (tab === "mine") d = d.filter((x) => x.owner === CURRENT_USER);
    if (tab === "collab") d = d.filter((x) => x.collaborators.includes(CURRENT_USER));
    if (fStatus !== "all") d = d.filter((x) => x.status === fStatus);
    if (search) d = d.filter((x) => x.title.includes(search) || (getCustomer(x.customerId, customers)?.name || "").includes(search));
    return d;
  }, [contracts, customers, tab, fStatus, search]);

  const columns = [
    { key: "title", label: "合同名稱", render: (r) => <span style={{ ...s.link, maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", display: "inline-block", whiteSpace: "nowrap", verticalAlign: "bottom" }}>{r.title}</span> },
    { key: "customer", label: "關聯客戶", render: (r) => getCustomer(r.customerId, customers)?.name || "—" },
    { key: "amount", label: "合同金額", mono: true, render: (r) => <span style={{ fontWeight: 600, color: T.text }}>{fmt(r.amount)}</span> },
    { key: "status", label: "狀態", render: (r) => <StatusBadge status={r.status} /> },
    { key: "signDate", label: "簽約日期", mono: true, render: (r) => r.signDate || "—" },
    { key: "endDate", label: "到期日期", mono: true, render: (r) => r.endDate || "—" },
    { key: "owner", label: "負責人", render: (r) => getRep(r.owner)?.name || "—" },
    { key: "created", label: "創建時間", mono: true },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <PageHeader title="合同" count={filtered.length} addLabel="新增合同" onAdd={() => {}} />
      <OwnerTabs active={tab} onChange={setTab} />
      <FilterRow>
        <select style={s.select} value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
          <option value="all">狀態：全部</option>
          {CONTRACT_STATUSES.map((x) => <option key={x} value={x}>{x}</option>)}
        </select>
        <div style={{ marginLeft: "auto" }}>
          <input style={{ ...s.input, width: 200, padding: "6px 10px", fontSize: 12 }} placeholder="搜尋合同名稱/客戶" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </FilterRow>
      <DataTable columns={columns} data={filtered} emptyText="找不到符合條件的合同" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// QUOTES VIEW
// ═══════════════════════════════════════════════════════
function QuotesView({ quotes, customers }) {
  const [tab, setTab] = useState("all");
  const [fStatus, setFStatus] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let d = quotes;
    if (tab === "mine") d = d.filter((x) => x.owner === CURRENT_USER);
    if (tab === "collab") d = d.filter((x) => x.collaborators.includes(CURRENT_USER));
    if (fStatus !== "all") d = d.filter((x) => x.status === fStatus);
    if (search) d = d.filter((x) => x.title.includes(search) || (getCustomer(x.customerId, customers)?.name || "").includes(search));
    return d;
  }, [quotes, customers, tab, fStatus, search]);

  const columns = [
    { key: "title", label: "報價單名稱", render: (r) => <span style={{ ...s.link, maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", display: "inline-block", whiteSpace: "nowrap", verticalAlign: "bottom" }}>{r.title}</span> },
    { key: "customer", label: "關聯客戶", render: (r) => getCustomer(r.customerId, customers)?.name || "—" },
    { key: "amount", label: "報價金額", mono: true, render: (r) => <span style={{ fontWeight: 600, color: T.text }}>{fmt(r.amount)}</span> },
    { key: "status", label: "狀態", render: (r) => <StatusBadge status={r.status} /> },
    { key: "validUntil", label: "有效期限", mono: true },
    { key: "owner", label: "負責人", render: (r) => getRep(r.owner)?.name || "—" },
    { key: "created", label: "創建時間", mono: true },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <PageHeader title="報價單" count={filtered.length} addLabel="新增報價單" onAdd={() => {}} />
      <OwnerTabs active={tab} onChange={setTab} />
      <FilterRow>
        <select style={s.select} value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
          <option value="all">狀態：全部</option>
          {QUOTE_STATUSES.map((x) => <option key={x} value={x}>{x}</option>)}
        </select>
        <div style={{ marginLeft: "auto" }}>
          <input style={{ ...s.input, width: 200, padding: "6px 10px", fontSize: 12 }} placeholder="搜尋報價單/客戶" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </FilterRow>
      <DataTable columns={columns} data={filtered} emptyText="找不到符合條件的報價單" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// PIPELINE VIEW (Kanban per product)
// ═══════════════════════════════════════════════════════
function PipelineView({ deals, customers, onMoveDeal }) {
  const [activeProduct, setActiveProduct] = useState(PRODUCTS[0].id);
  const [dragId, setDragId] = useState(null);

  const product = PRODUCTS.find((p) => p.id === activeProduct);
  const stages = product?.stages || [];
  const pipelineDeals = deals.filter((d) => d.product === activeProduct && d.status === "進行中");

  const handleDrop = (stage) => {
    if (dragId) { onMoveDeal(dragId, stage); setDragId(null); }
  };

  // Summary stats
  const totalAmount = pipelineDeals.reduce((s, d) => s + d.amount, 0);
  const totalCount = pipelineDeals.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header */}
      <div style={{ padding: "14px 16px", borderBottom: `1px solid ${T.borderLight}`, flexShrink: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: T.text, fontFamily: T.font }}>Pipeline 看板</h2>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 12, color: T.textTertiary, fontFamily: T.mono }}>{totalCount} 筆</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: product?.color || T.text, fontFamily: T.mono }}>{fmt(totalAmount)}</span>
          </div>
        </div>
        {/* Product tabs */}
        <div style={{ display: "flex", gap: 6 }}>
          {PRODUCTS.map((p) => {
            const active = activeProduct === p.id;
            const count = deals.filter((d) => d.product === p.id && d.status === "進行中").length;
            return (
              <button key={p.id} onClick={() => setActiveProduct(p.id)} style={{
                padding: "6px 14px", borderRadius: 20, border: active ? `1.5px solid ${p.color}` : `1.5px solid ${T.border}`,
                background: active ? `${p.color}10` : "transparent", color: active ? p.color : T.textSecondary,
                fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: T.font,
                display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap",
              }}>
                <span>{p.icon}</span> {p.name}
                <span style={{ fontSize: 10, background: active ? `${p.color}20` : T.surfaceAlt, borderRadius: 8, padding: "1px 6px", fontFamily: T.mono }}>{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Kanban board */}
      <div style={{ flex: 1, display: "flex", gap: 10, padding: "12px 12px", overflowX: "auto", overflowY: "hidden", WebkitOverflowScrolling: "touch" }}>
        {stages.map((stage) => {
          const stageDeals = pipelineDeals.filter((d) => d.stage === stage);
          const stageTotal = stageDeals.reduce((acc, d) => acc + d.amount, 0);
          return (
            <PipelineColumn
              key={stage} stage={stage} deals={stageDeals} customers={customers}
              product={product} stageTotal={stageTotal}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(stage)}
              onDragId={setDragId} dragId={dragId}
              allStages={stages} onMoveDeal={onMoveDeal}
            />
          );
        })}
      </div>
    </div>
  );
}

function PipelineColumn({ stage, deals, customers, product, stageTotal, onDragOver, onDrop, onDragId, dragId, allStages, onMoveDeal }) {
  const [over, setOver] = useState(false);
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); onDrop(); }}
      style={{
        flex: `0 0 ${Math.max(220, 100 / allStages.length)}%`, minWidth: 220, maxWidth: 300,
        display: "flex", flexDirection: "column", background: over ? `${product.color}06` : T.surfaceAlt,
        borderRadius: T.radius, border: over ? `1.5px solid ${product.color}30` : `1px solid ${T.borderLight}`,
        transition: "all .15s", overflow: "hidden",
      }}
    >
      {/* Column header */}
      <div style={{ padding: "10px 12px 8px", borderBottom: `1px solid ${T.borderLight}` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: product.color }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: T.text, fontFamily: T.font }}>{stage}</span>
          </div>
          <span style={{ fontSize: 11, fontWeight: 600, color: T.textTertiary, background: T.surface, borderRadius: 10, padding: "1px 8px", fontFamily: T.mono }}>{deals.length}</span>
        </div>
        <div style={{ fontSize: 12, color: product.color, fontWeight: 600, fontFamily: T.mono }}>{fmt(stageTotal)}</div>
      </div>

      {/* Cards */}
      <div style={{ flex: 1, padding: "6px 8px", overflowY: "auto", minHeight: 80 }}>
        {deals.map((d) => (
          <PipelineCard key={d.id} deal={d} customers={customers} product={product}
            onDragStart={() => onDragId(d.id)} allStages={allStages} currentStage={stage} onMoveDeal={onMoveDeal} />
        ))}
        {deals.length === 0 && <div style={{ padding: 20, textAlign: "center", color: T.textTertiary, fontSize: 12 }}>拖曳至此</div>}
      </div>
    </div>
  );
}

function PipelineCard({ deal, customers, product, onDragStart, allStages, currentStage, onMoveDeal }) {
  const cust = getCustomer(deal.customerId, customers);
  const stageIdx = allStages.indexOf(currentStage);
  const prev = stageIdx > 0 ? allStages[stageIdx - 1] : null;
  const next = stageIdx < allStages.length - 1 ? allStages[stageIdx + 1] : null;

  return (
    <div
      draggable
      onDragStart={(e) => { e.dataTransfer.setData("text", deal.id); onDragStart(); e.currentTarget.style.opacity = "0.4"; }}
      onDragEnd={(e) => { e.currentTarget.style.opacity = "1"; }}
      style={{
        background: T.surface, border: `1px solid ${T.borderLight}`, borderLeft: `3px solid ${product.color}`,
        borderRadius: T.radiusSm, padding: "10px 11px", marginBottom: 6, cursor: "grab",
        transition: "box-shadow .12s", WebkitTapHighlightColor: "transparent",
      }}
      onMouseEnter={(e) => e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)"}
      onMouseLeave={(e) => e.currentTarget.style.boxShadow = "none"}
    >
      <div style={{ fontSize: 13, fontWeight: 600, color: T.text, fontFamily: T.font, marginBottom: 4, lineHeight: 1.3 }}>{deal.title}</div>
      <div style={{ fontSize: 11, color: T.textTertiary, marginBottom: 6 }}>{cust?.name || "—"} · {getRep(deal.owner)?.name}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: product.color, fontFamily: T.mono, marginBottom: 6 }}>{fmt(deal.amount)}</div>
      {/* Mobile move buttons */}
      <div style={{ display: "flex", gap: 4 }}>
        {prev && (
          <button onClick={(e) => { e.stopPropagation(); onMoveDeal(deal.id, prev); }} style={{
            flex: 1, padding: "4px 0", borderRadius: 4, border: `1px solid ${T.border}`,
            background: T.surfaceAlt, color: T.textSecondary, fontSize: 10, fontWeight: 600,
            cursor: "pointer", fontFamily: T.font,
          }}>← {prev.length > 3 ? prev.slice(0, 3) + "…" : prev}</button>
        )}
        {next && (
          <button onClick={(e) => { e.stopPropagation(); onMoveDeal(deal.id, next); }} style={{
            flex: 1, padding: "4px 0", borderRadius: 4, border: `1px solid ${product.color}30`,
            background: `${product.color}08`, color: product.color, fontSize: 10, fontWeight: 600,
            cursor: "pointer", fontFamily: T.font,
          }}>{next.length > 3 ? next.slice(0, 3) + "…" : next} →</button>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// SIDEBAR
// ═══════════════════════════════════════════════════════
const NAV_ITEMS = [
  { section: "CRM 管理" },
  { id: "leads", label: "線索", icon: "⊕" },
  { id: "customers", label: "客戶", icon: "◎" },
  { id: "contacts", label: "聯系人", icon: "☷" },
  { id: "deals", label: "商機", icon: "◈" },
  { id: "pipeline", label: "Pipeline", icon: "▦" },
  { id: "contracts", label: "合同", icon: "☰" },
  { id: "quotes", label: "報價單", icon: "☲" },
];

function Sidebar({ active, onChange, isMobile, open, onClose }) {
  if (isMobile && !open) return null;

  const sidebar = (
    <div style={{
      width: isMobile ? 240 : 200, background: T.surface, borderRight: `1px solid ${T.border}`,
      display: "flex", flexDirection: "column", flexShrink: 0, height: "100%",
      ...(isMobile ? { position: "fixed", top: 0, left: 0, zIndex: 200, boxShadow: "4px 0 20px rgba(0,0,0,0.08)" } : {}),
    }}>
      {/* Logo */}
      <div style={{ padding: "16px 16px 12px", borderBottom: `1px solid ${T.borderLight}`, display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 7, background: T.accent,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", fontSize: 12, fontWeight: 800,
        }}>C</div>
        <span style={{ fontSize: 15, fontWeight: 800, color: T.text, fontFamily: T.font, letterSpacing: -0.3 }}>CRM</span>
        {isMobile && <button onClick={onClose} style={{ marginLeft: "auto", background: "none", border: "none", fontSize: 18, color: T.textTertiary, cursor: "pointer" }}>✕</button>}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "8px 8px", overflowY: "auto" }}>
        {NAV_ITEMS.map((item, i) => {
          if (item.section) return (
            <div key={i} style={{ padding: "16px 10px 6px", fontSize: 10, fontWeight: 700, color: T.textTertiary, fontFamily: T.font, letterSpacing: 1.5, textTransform: "uppercase" }}>{item.section}</div>
          );
          const isActive = active === item.id;
          return (
            <button key={item.id}
              onClick={() => { if (!item.disabled) { onChange(item.id); if (isMobile) onClose(); } }}
              style={{
                display: "flex", alignItems: "center", gap: 10, width: "100%",
                padding: "9px 12px", borderRadius: 6, border: "none", cursor: item.disabled ? "default" : "pointer",
                background: isActive ? T.accentBg : "transparent",
                color: item.disabled ? T.textTertiary : isActive ? T.accentText : T.textSecondary,
                fontSize: 13, fontWeight: isActive ? 700 : 500, fontFamily: T.font,
                textAlign: "left", transition: "all .12s", opacity: item.disabled ? 0.5 : 1,
                marginBottom: 2,
              }}
            >
              <span style={{ fontSize: 14, width: 20, textAlign: "center", flexShrink: 0 }}>{item.icon}</span>
              {item.label}
              {item.disabled && <span style={{ fontSize: 9, marginLeft: "auto", color: T.textTertiary, background: T.surfaceAlt, padding: "1px 5px", borderRadius: 3 }}>Soon</span>}
            </button>
          );
        })}
      </nav>

      {/* User */}
      <div style={{ padding: "12px 16px", borderTop: `1px solid ${T.borderLight}`, display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 28, height: 28, borderRadius: "50%", background: T.accentBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: T.accentText }}>{getRep(CURRENT_USER)?.name[0]}</div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: T.text, fontFamily: T.font }}>{getRep(CURRENT_USER)?.name}</div>
          <div style={{ fontSize: 10, color: T.textTertiary }}>業務主管</div>
        </div>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <>
        <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.2)", zIndex: 199 }} />
        {sidebar}
      </>
    );
  }
  return sidebar;
}

// ═══════════════════════════════════════════════════════
// MOBILE BOTTOM NAV
// ═══════════════════════════════════════════════════════
function MobileBottomNav({ active, onChange }) {
  const items = [
    { id: "leads", label: "線索", icon: "⊕" },
    { id: "customers", label: "客戶", icon: "◎" },
    { id: "deals", label: "商機", icon: "◈" },
    { id: "pipeline", label: "Pipeline", icon: "▦" },
    { id: "more", label: "更多", icon: "⋯" },
  ];
  const [showMore, setShowMore] = useState(false);
  const moreItems = [
    { id: "contacts", label: "聯系人", icon: "☷" },
    { id: "contracts", label: "合同", icon: "☰" },
    { id: "quotes", label: "報價單", icon: "☲" },
  ];
  return (
    <>
      {showMore && (
        <div style={{ position: "fixed", bottom: 56, left: 0, right: 0, zIndex: 101, background: T.surface, borderTop: `1px solid ${T.border}`, padding: "8px 0", display: "flex", justifyContent: "space-around" }}>
          {moreItems.map((v) => (
            <button key={v.id} onClick={() => { onChange(v.id); setShowMore(false); }} style={{
              background: "none", border: "none", cursor: "pointer",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
              color: active === v.id ? T.accent : T.textTertiary,
              padding: "4px 20px", fontFamily: T.font, minHeight: 40,
            }}>
              <span style={{ fontSize: 16 }}>{v.icon}</span>
              <span style={{ fontSize: 10, fontWeight: 600 }}>{v.label}</span>
            </button>
          ))}
        </div>
      )}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100,
        background: "rgba(255,255,255,0.96)", backdropFilter: "blur(10px)",
        borderTop: `1px solid ${T.border}`, display: "flex", justifyContent: "space-around",
        padding: "6px 0 max(env(safe-area-inset-bottom, 4px), 4px)",
      }}>
        {items.map((v) => (
          <button key={v.id} onClick={() => { if (v.id === "more") setShowMore(!showMore); else { onChange(v.id); setShowMore(false); } }} style={{
            background: "none", border: "none", cursor: "pointer",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
            color: (active === v.id || (v.id === "more" && ["contacts", "contracts", "quotes"].includes(active))) ? T.accent : T.textTertiary,
            padding: "4px 12px", fontFamily: T.font, minWidth: 50, minHeight: 44,
          }}>
            <span style={{ fontSize: 17 }}>{v.icon}</span>
            <span style={{ fontSize: 10, fontWeight: 600 }}>{v.label}</span>
          </button>
        ))}
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════
export default function CRM() {
  const isMobile = useIsMobile();
  const [view, setView] = useState("leads");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [deals, setDeals] = useState(DEALS);

  const handleMoveDeal = (dealId, newStage) => {
    setDeals((prev) => prev.map((d) => d.id === dealId ? { ...d, stage: newStage } : d));
  };

  return (
    <div style={{
      height: "100vh", display: "flex", background: T.bg, fontFamily: T.font,
      overflow: "hidden",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
      <style>{`
        * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
        input, select, textarea { font-size: 16px !important; }
        ::-webkit-scrollbar { width: 3px; height: 3px; }
        ::-webkit-scrollbar-thumb { background: #ddd; border-radius: 3px; }
        ::-webkit-scrollbar-track { background: transparent; }
        input:focus, select:focus { border-color: ${T.accent} !important; }
        tr:active { background: ${T.surfaceAlt}; }
      `}</style>

      {/* Sidebar */}
      <Sidebar active={view} onChange={setView} isMobile={isMobile} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", paddingBottom: isMobile ? 56 : 0 }}>
        {/* Mobile top bar */}
        {isMobile && (
          <div style={{
            display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
            borderBottom: `1px solid ${T.border}`, background: T.surface, flexShrink: 0,
          }}>
            <button onClick={() => setSidebarOpen(true)} style={{
              background: "none", border: "none", fontSize: 20, cursor: "pointer",
              color: T.textSecondary, padding: 4, display: "flex",
            }}>☰</button>
            <span style={{ fontSize: 15, fontWeight: 700, color: T.text }}>
              {{ leads: "線索", customers: "客戶", contacts: "聯系人", deals: "商機", pipeline: "Pipeline", contracts: "合同", quotes: "報價單" }[view] || "CRM"}
            </span>
          </div>
        )}

        {/* View content */}
        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {view === "leads" && <LeadsView leads={LEADS} />}
          {view === "customers" && <CustomersView customers={CUSTOMERS} />}
          {view === "contacts" && <ContactsView contacts={CONTACTS} customers={CUSTOMERS} />}
          {view === "deals" && <DealsView deals={deals} customers={CUSTOMERS} />}
          {view === "pipeline" && <PipelineView deals={deals} customers={CUSTOMERS} onMoveDeal={handleMoveDeal} />}
          {view === "contracts" && <ContractsView contracts={CONTRACTS} customers={CUSTOMERS} />}
          {view === "quotes" && <QuotesView quotes={QUOTES} customers={CUSTOMERS} />}
        </div>
      </div>

      {/* Mobile bottom nav */}
      {isMobile && <MobileBottomNav active={view} onChange={setView} />}
    </div>
  );
}
