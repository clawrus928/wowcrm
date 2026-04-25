import { useEffect } from "react";
import { T } from "../theme.js";
import { useIsMobile } from "../utils.js";

export function Drawer({ open, title, onClose, children, footer, width = 480 }) {
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.25)",
          zIndex: 300,
          animation: "drawer-fade .15s ease",
        }}
      />
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: isMobile ? "100%" : width,
          maxWidth: "100%",
          background: T.surface,
          borderLeft: `1px solid ${T.border}`,
          boxShadow: "-8px 0 32px rgba(0,0,0,0.08)",
          zIndex: 301,
          display: "flex",
          flexDirection: "column",
          fontFamily: T.font,
          animation: "drawer-slide .18s ease",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 18px",
            borderBottom: `1px solid ${T.borderLight}`,
            flexShrink: 0,
          }}
        >
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: T.text }}>{title}</h3>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: 22,
              cursor: "pointer",
              color: T.textTertiary,
              lineHeight: 1,
              padding: 4,
            }}
          >
            ✕
          </button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px" }}>{children}</div>
        {footer && (
          <div
            style={{
              padding: "12px 18px",
              borderTop: `1px solid ${T.borderLight}`,
              display: "flex",
              justifyContent: "flex-end",
              gap: 8,
              flexShrink: 0,
              background: T.surface,
            }}
          >
            {footer}
          </div>
        )}
      </div>
      <style>{`
        @keyframes drawer-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes drawer-slide { from { transform: translateX(20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      `}</style>
    </>
  );
}
