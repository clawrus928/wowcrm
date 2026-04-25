import { T } from "../theme.js";

export function OwnerTabs({ active, onChange }) {
  const tabs = [
    { id: "all", label: "全部" },
    { id: "mine", label: "我負責的" },
    { id: "collab", label: "我協作的" },
  ];
  return (
    <div style={{ display: "flex", gap: 0, borderBottom: `2px solid ${T.borderLight}` }}>
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          style={{
            padding: "10px 18px",
            border: "none",
            background: "none",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: active === t.id ? 700 : 500,
            fontFamily: T.font,
            color: active === t.id ? T.accent : T.textSecondary,
            borderBottom: active === t.id ? `2px solid ${T.accent}` : "2px solid transparent",
            marginBottom: -2,
            transition: "all .15s",
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
