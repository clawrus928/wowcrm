import { useState } from "react";
import { T } from "../theme.js";

export function MobileBottomNav({ active, onChange }) {
  const items = [
    { id: "dashboard", label: "總覽", icon: "▥" },
    { id: "leads", label: "線索", icon: "⊕" },
    { id: "customers", label: "客戶", icon: "◎" },
    { id: "pipeline", label: "Pipeline", icon: "▦" },
    { id: "more", label: "更多", icon: "⋯" },
  ];
  const [showMore, setShowMore] = useState(false);
  const moreItems = [
    { id: "contacts", label: "聯系人", icon: "☷" },
    { id: "deals", label: "商機", icon: "◈" },
    { id: "contracts", label: "合同", icon: "☰" },
    { id: "quotes", label: "報價單", icon: "☲" },
    { id: "channels", label: "渠道方", icon: "⊟" },
  ];
  return (
    <>
      {showMore && (
        <div
          style={{
            position: "fixed",
            bottom: 56,
            left: 0,
            right: 0,
            zIndex: 101,
            background: T.surface,
            borderTop: `1px solid ${T.border}`,
            padding: "8px 0",
            display: "flex",
            justifyContent: "space-around",
            flexWrap: "wrap",
          }}
        >
          {moreItems.map((v) => (
            <button
              key={v.id}
              onClick={() => {
                onChange(v.id);
                setShowMore(false);
              }}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
                color: active === v.id ? T.accent : T.textTertiary,
                padding: "4px 12px",
                fontFamily: T.font,
                minHeight: 40,
              }}
            >
              <span style={{ fontSize: 16 }}>{v.icon}</span>
              <span style={{ fontSize: 10, fontWeight: 600 }}>{v.label}</span>
            </button>
          ))}
        </div>
      )}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          background: "rgba(255,255,255,0.96)",
          backdropFilter: "blur(10px)",
          borderTop: `1px solid ${T.border}`,
          display: "flex",
          justifyContent: "space-around",
          padding: "6px 0 max(env(safe-area-inset-bottom, 4px), 4px)",
        }}
      >
        {items.map((v) => (
          <button
            key={v.id}
            onClick={() => {
              if (v.id === "more") setShowMore(!showMore);
              else {
                onChange(v.id);
                setShowMore(false);
              }
            }}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
              color:
                active === v.id ||
                (v.id === "more" &&
                  ["contacts", "deals", "contracts", "quotes", "channels"].includes(active))
                  ? T.accent
                  : T.textTertiary,
              padding: "4px 10px",
              fontFamily: T.font,
              minWidth: 50,
              minHeight: 44,
            }}
          >
            <span style={{ fontSize: 17 }}>{v.icon}</span>
            <span style={{ fontSize: 10, fontWeight: 600 }}>{v.label}</span>
          </button>
        ))}
      </div>
    </>
  );
}
