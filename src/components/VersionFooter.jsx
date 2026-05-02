import { T } from "../theme.js";

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
          bottom: 6,
          zIndex: 50,
          pointerEvents: "none",
        };

  return (
    <div
      style={{
        ...positionStyles,
        fontSize: 10,
        color: T.textTertiary,
        fontFamily: T.mono,
        letterSpacing: 0.3,
        opacity: 0.7,
      }}
    >
      v {SHA}
      {TIME && ` · ${TIME}`}
    </div>
  );
}
