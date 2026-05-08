import { useEffect, useMemo, useRef, useState } from "react";
import { T } from "../theme.js";
import { s } from "../styles.js";

const labelStyle = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  color: T.textSecondary,
  marginBottom: 6,
  fontFamily: T.font,
};

const errorStyle = {
  fontSize: 11,
  color: "#DC2626",
  marginTop: 4,
  fontFamily: T.font,
};

export function Field({ label, required, error, children, hint }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={labelStyle}>
        {label}
        {required && <span style={{ color: "#DC2626", marginLeft: 3 }}>*</span>}
      </label>
      {children}
      {hint && !error && (
        <div style={{ fontSize: 11, color: T.textTertiary, marginTop: 4 }}>{hint}</div>
      )}
      {error && <div style={errorStyle}>{error}</div>}
    </div>
  );
}

export function TextInput({ value, onChange, placeholder, type = "text" }) {
  return (
    <input
      type={type}
      style={s.input}
      value={value ?? ""}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export function NumberInput({ value, onChange, placeholder }) {
  return (
    <input
      type="number"
      style={s.input}
      value={value ?? ""}
      placeholder={placeholder}
      onChange={(e) => {
        const v = e.target.value;
        onChange(v === "" ? null : Number(v));
      }}
    />
  );
}

export function TextArea({ value, onChange, placeholder, rows = 3 }) {
  return (
    <textarea
      rows={rows}
      style={{ ...s.input, fontFamily: T.font, resize: "vertical", minHeight: 60 }}
      value={value ?? ""}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export function SelectInput({ value, onChange, options, placeholder }) {
  return (
    <select
      style={{ ...s.input, padding: "8px 10px", cursor: "pointer" }}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => {
        const v = typeof o === "string" ? o : o.value;
        const lbl = typeof o === "string" ? o : o.label;
        return (
          <option key={v} value={v}>
            {lbl}
          </option>
        );
      })}
    </select>
  );
}

export function MultiSelect({ value, onChange, options }) {
  const selected = value || [];
  const toggle = (v) => {
    if (selected.includes(v)) onChange(selected.filter((x) => x !== v));
    else onChange([...selected, v]);
  };
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 6,
        padding: 8,
        border: `1.5px solid ${T.border}`,
        borderRadius: T.radiusSm,
        background: T.surface,
      }}
    >
      {options.map((o) => {
        const v = typeof o === "string" ? o : o.value;
        const lbl = typeof o === "string" ? o : o.label;
        const on = selected.includes(v);
        return (
          <button
            type="button"
            key={v}
            onClick={() => toggle(v)}
            style={{
              padding: "4px 10px",
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 600,
              border: on ? `1.5px solid ${T.accent}` : `1.5px solid ${T.border}`,
              background: on ? T.accentBg : T.surface,
              color: on ? T.accentText : T.textSecondary,
              cursor: "pointer",
              fontFamily: T.font,
            }}
          >
            {lbl}
          </button>
        );
      })}
    </div>
  );
}

export function DateInput({ value, onChange }) {
  return (
    <input
      type="date"
      style={s.input}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
    />
  );
}

// Searchable select with type-to-filter. Drop-in for SelectInput when the
// option list can grow large (customers, deals, suppliers, channels).
export function SearchSelect({
  value,
  onChange,
  options,
  placeholder = "搜尋或選擇…",
  emptyText = "請先建立資料",
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef(null);

  const normalized = useMemo(
    () =>
      (options || []).map((o) =>
        typeof o === "string" ? { value: o, label: o } : o
      ),
    [options]
  );

  const selected = normalized.find((o) => o.value === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return normalized;
    return normalized.filter((o) => o.label.toLowerCase().includes(q));
  }, [normalized, query]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <input
        type="text"
        autoComplete="off"
        disabled={disabled}
        style={{
          ...s.input,
          paddingRight: value && !disabled ? 36 : 30,
          cursor: disabled ? "not-allowed" : "text",
          background: disabled ? T.surfaceAlt : T.surface,
        }}
        value={open ? query : selected?.label || ""}
        placeholder={placeholder}
        onFocus={() => {
          if (!disabled) {
            setQuery("");
            setOpen(true);
          }
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setOpen(false);
            setQuery("");
            e.currentTarget.blur();
          }
        }}
      />
      <div
        style={{
          position: "absolute",
          right: 10,
          top: "50%",
          transform: "translateY(-50%)",
          color: T.textTertiary,
          fontSize: 11,
          pointerEvents: "none",
        }}
      >
        ▾
      </div>
      {value && !disabled && (
        <button
          type="button"
          aria-label="清除"
          onMouseDown={(e) => {
            e.preventDefault();
            onChange(null);
            setQuery("");
          }}
          style={{
            position: "absolute",
            right: 26,
            top: "50%",
            transform: "translateY(-50%)",
            background: "none",
            border: "none",
            color: T.textTertiary,
            fontSize: 14,
            cursor: "pointer",
            lineHeight: 1,
            padding: 2,
          }}
        >
          ×
        </button>
      )}
      {open && !disabled && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            maxHeight: 240,
            overflowY: "auto",
            background: T.surface,
            border: `1.5px solid ${T.border}`,
            borderRadius: T.radiusSm,
            boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
            zIndex: 400,
            fontFamily: T.font,
          }}
        >
          {normalized.length === 0 ? (
            <div
              style={{
                padding: "10px 12px",
                fontSize: 12,
                color: T.textTertiary,
              }}
            >
              {emptyText}
            </div>
          ) : filtered.length === 0 ? (
            <div
              style={{
                padding: "10px 12px",
                fontSize: 12,
                color: T.textTertiary,
              }}
            >
              沒有符合「{query}」的項目
            </div>
          ) : (
            filtered.slice(0, 100).map((o) => {
              const isSel = o.value === value;
              return (
                <button
                  type="button"
                  key={o.value}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onChange(o.value);
                    setOpen(false);
                    setQuery("");
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    background: isSel ? T.accentBg : "transparent",
                    color: isSel ? T.accentText : T.text,
                    border: "none",
                    padding: "8px 12px",
                    fontSize: 13,
                    cursor: "pointer",
                    fontFamily: T.font,
                  }}
                  onMouseEnter={(e) => {
                    if (!isSel) e.currentTarget.style.background = T.surfaceAlt;
                  }}
                  onMouseLeave={(e) => {
                    if (!isSel) e.currentTarget.style.background = "transparent";
                  }}
                >
                  {o.label}
                </button>
              );
            })
          )}
          {filtered.length > 100 && (
            <div
              style={{
                padding: "6px 12px",
                fontSize: 11,
                color: T.textTertiary,
                borderTop: `1px solid ${T.borderLight}`,
              }}
            >
              還有 {filtered.length - 100} 筆，請輸入關鍵字縮小範圍
            </div>
          )}
        </div>
      )}
    </div>
  );
}
