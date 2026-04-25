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
