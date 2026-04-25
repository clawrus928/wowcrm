import { CURRENT_USER } from "../constants.js";
import { getRep } from "../utils.js";
import { T } from "../theme.js";

export const NAV_ITEMS = [
  { section: "CRM 管理" },
  { id: "dashboard", label: "儀表板", icon: "▥" },
  { id: "leads", label: "線索", icon: "⊕" },
  { id: "customers", label: "客戶", icon: "◎" },
  { id: "contacts", label: "聯系人", icon: "☷" },
  { id: "deals", label: "商機", icon: "◈" },
  { id: "pipeline", label: "Pipeline", icon: "▦" },
  { id: "contracts", label: "合同", icon: "☰" },
  { id: "quotes", label: "報價單", icon: "☲" },
];

export function Sidebar({ active, onChange, isMobile, open, onClose, onReset }) {
  if (isMobile && !open) return null;

  const sidebar = (
    <div
      style={{
        width: isMobile ? 240 : 200,
        background: T.surface,
        borderRight: `1px solid ${T.border}`,
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        height: "100%",
        ...(isMobile
          ? {
              position: "fixed",
              top: 0,
              left: 0,
              zIndex: 200,
              boxShadow: "4px 0 20px rgba(0,0,0,0.08)",
            }
          : {}),
      }}
    >
      <div
        style={{
          padding: "16px 16px 12px",
          borderBottom: `1px solid ${T.borderLight}`,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 7,
            background: T.accent,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontSize: 12,
            fontWeight: 800,
          }}
        >
          C
        </div>
        <span
          style={{
            fontSize: 15,
            fontWeight: 800,
            color: T.text,
            fontFamily: T.font,
            letterSpacing: -0.3,
          }}
        >
          CRM
        </span>
        {isMobile && (
          <button
            onClick={onClose}
            style={{
              marginLeft: "auto",
              background: "none",
              border: "none",
              fontSize: 18,
              color: T.textTertiary,
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        )}
      </div>

      <nav style={{ flex: 1, padding: "8px 8px", overflowY: "auto" }}>
        {NAV_ITEMS.map((item, i) => {
          if (item.section)
            return (
              <div
                key={i}
                style={{
                  padding: "16px 10px 6px",
                  fontSize: 10,
                  fontWeight: 700,
                  color: T.textTertiary,
                  fontFamily: T.font,
                  letterSpacing: 1.5,
                  textTransform: "uppercase",
                }}
              >
                {item.section}
              </div>
            );
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                onChange(item.id);
                if (isMobile) onClose();
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                width: "100%",
                padding: "9px 12px",
                borderRadius: 6,
                border: "none",
                cursor: "pointer",
                background: isActive ? T.accentBg : "transparent",
                color: isActive ? T.accentText : T.textSecondary,
                fontSize: 13,
                fontWeight: isActive ? 700 : 500,
                fontFamily: T.font,
                textAlign: "left",
                transition: "all .12s",
                marginBottom: 2,
              }}
            >
              <span style={{ fontSize: 14, width: 20, textAlign: "center", flexShrink: 0 }}>
                {item.icon}
              </span>
              {item.label}
            </button>
          );
        })}
      </nav>

      <div
        style={{
          padding: "12px 16px",
          borderTop: `1px solid ${T.borderLight}`,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: T.accentBg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            fontWeight: 700,
            color: T.accentText,
          }}
        >
          {getRep(CURRENT_USER)?.name[0]}
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: T.text,
              fontFamily: T.font,
            }}
          >
            {getRep(CURRENT_USER)?.name}
          </div>
          <div style={{ fontSize: 10, color: T.textTertiary }}>業務主管</div>
        </div>
        <button
          title="重置資料"
          onClick={() => {
            if (confirm("確定重置全部資料為初始狀態？")) onReset?.();
          }}
          style={{
            background: "none",
            border: "none",
            fontSize: 14,
            color: T.textTertiary,
            cursor: "pointer",
            padding: 4,
          }}
        >
          ↻
        </button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <>
        <div
          onClick={onClose}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.2)",
            zIndex: 199,
          }}
        />
        {sidebar}
      </>
    );
  }
  return sidebar;
}
