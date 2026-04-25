import { T } from "../theme.js";

export function DetailRow({ label, children }) {
  return (
    <div style={{ display: "flex", padding: "8px 0", borderBottom: `1px solid ${T.borderLight}` }}>
      <div
        style={{
          width: 90,
          fontSize: 12,
          color: T.textTertiary,
          fontFamily: T.font,
          flexShrink: 0,
          paddingTop: 2,
        }}
      >
        {label}
      </div>
      <div style={{ flex: 1, fontSize: 13, color: T.text, fontFamily: T.font, wordBreak: "break-word" }}>
        {children ?? <span style={{ color: T.textTertiary }}>—</span>}
      </div>
    </div>
  );
}

export function DetailSection({ title, children, action }) {
  return (
    <div style={{ marginTop: 18 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: T.textTertiary,
            letterSpacing: 1.5,
            textTransform: "uppercase",
            fontFamily: T.font,
          }}
        >
          {title}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}
