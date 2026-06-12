import { useEffect, useState } from "react";
import { T } from "../theme.js";

// Lightweight global toast. Call toast(msg) / toast(msg, "success") from
// anywhere (no provider / prop-drilling needed); <Toaster/> is mounted once
// in App and renders the queue. Replaces blocking alert() popups.

let _id = 0;
const listeners = new Set();

export function toast(message, type = "error") {
  if (!message) return;
  const item = { id: ++_id, message: String(message), type };
  for (const fn of listeners) fn(item);
}

const COLORS = {
  error: "#DC2626",
  success: "#059669",
  info: "#334155",
};

export function Toaster() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const onToast = (item) => {
      setItems((prev) => [...prev, item]);
      setTimeout(() => {
        setItems((prev) => prev.filter((x) => x.id !== item.id));
      }, 3200);
    };
    listeners.add(onToast);
    return () => listeners.delete(onToast);
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        bottom: 72,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        alignItems: "center",
        pointerEvents: "none",
        width: "max-content",
        maxWidth: "90vw",
      }}
    >
      {items.map((it) => (
        <div
          key={it.id}
          style={{
            background: COLORS[it.type] || COLORS.info,
            color: "#fff",
            padding: "10px 18px",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            fontFamily: T.font,
            boxShadow: "0 6px 20px rgba(0,0,0,.22)",
            maxWidth: 360,
            textAlign: "center",
            lineHeight: 1.4,
            animation: "wowToastIn .18s ease-out",
          }}
        >
          {it.message}
        </div>
      ))}
      <style>{`@keyframes wowToastIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}
