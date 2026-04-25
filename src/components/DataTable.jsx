import { T } from "../theme.js";
import { s } from "../styles.js";

export function FilterRow({ children }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        padding: "10px 16px",
        flexWrap: "wrap",
        alignItems: "center",
        borderBottom: `1px solid ${T.borderLight}`,
        background: T.surfaceAlt,
      }}
    >
      {children}
    </div>
  );
}

export function DataTable({ columns, data, onRowClick, emptyText }) {
  return (
    <div
      style={{
        flex: 1,
        overflowY: "auto",
        overflowX: "auto",
        WebkitOverflowScrolling: "touch",
      }}
    >
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} style={s.th}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                style={{ ...s.td, textAlign: "center", padding: 40, color: T.textTertiary }}
              >
                {emptyText || "暫無資料"}
              </td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr
                key={row.id || i}
                onClick={() => onRowClick?.(row)}
                style={{
                  cursor: onRowClick ? "pointer" : "default",
                  transition: "background .1s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = T.surfaceAlt)}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                {columns.map((c) => (
                  <td key={c.key} style={c.mono ? s.tdMono : s.td}>
                    {c.render ? c.render(row) : row[c.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function PageHeader({ title, count, onAdd, addLabel, extra }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "14px 16px",
        borderBottom: `1px solid ${T.borderLight}`,
        gap: 8,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: T.text, fontFamily: T.font }}>
          {title}
        </h2>
        {count !== undefined && (
          <span style={{ fontSize: 12, color: T.textTertiary, fontFamily: T.mono }}>{count} 筆</span>
        )}
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        {extra}
        {onAdd && (
          <button onClick={onAdd} style={s.btn(true)}>
            ＋ {addLabel || "新增"}
          </button>
        )}
      </div>
    </div>
  );
}
