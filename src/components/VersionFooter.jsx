import { T } from "../theme.js";
import { useIsMobile } from "../utils.js";

const RAW_SHA = import.meta.env.VITE_GIT_SHA || "";
const RAW_TIME = import.meta.env.VITE_BUILD_TIME || "";

const SHA = RAW_SHA && RAW_SHA !== "dev" ? RAW_SHA.slice(0, 7) : "dev";

function formatBuildTime(iso) {
  if (!iso || iso === "unknown") return "";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return "";
  }
}

const TIME = formatBuildTime(RAW_TIME);

export function VersionFooter({ corner = "bottom-right" }) {
  const isMobile = useIsMobile();

  const positionStyles =
    corner === "center"
      ? {
          position: "static",
          marginTop: 12,
          textAlign: "center",
        }
      : {
          position: "fixed",
          right: 8,
          // mobile bottom nav is ~56px + safe-area inset
          bottom: isMobile ? 62 : 6,
          zIndex: 50,
          pointerEvents: "none",
          background: isMobile ? "rgba(255,255,255,0.7)" : "transparent",
          padding: isMobile ? "1px 6px" : 0,
          borderRadius: 4,
        };

  return (
    <div
      style={{
        ...positionStyles,
        fontSize: 10,
        color: T.textTertiary,
        fontFamily: T.mono,
        letterSpacing: 0.3,
        opacity: 0.85,
      }}
    >
      v {SHA}
      {TIME && ` · ${TIME}`}
    </div>
  );
}
