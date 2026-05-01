import { useState } from "react";
import { REPS } from "../constants.js";
import { DEMO_PASSWORD } from "../data/store.js";
import { T } from "../theme.js";
import { s } from "../styles.js";

export function LoginView({ onLogin }) {
  const [userId, setUserId] = useState(REPS[0].id);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e?.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await onLogin(userId, password);
      if (!result.ok) {
        setError(result.error || "登入失敗");
      }
    } catch (err) {
      setError(err.message || "登入失敗");
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = () => setPassword(DEMO_PASSWORD);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: `radial-gradient(circle at 20% 0%, ${T.accent}12 0%, ${T.bg} 50%)`,
        fontFamily: T.font,
        padding: 16,
      }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap"
        rel="stylesheet"
      />
      <form
        onSubmit={submit}
        style={{
          width: "100%",
          maxWidth: 360,
          background: T.surface,
          borderRadius: 14,
          border: `1px solid ${T.border}`,
          boxShadow: "0 12px 48px rgba(0,0,0,0.06)",
          padding: "32px 28px",
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: T.accent,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 22,
              fontWeight: 800,
              boxShadow: `0 6px 20px ${T.accent}40`,
            }}
          >
            C
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 800,
              color: T.text,
              letterSpacing: -0.5,
            }}
          >
            WOW CRM
          </h1>
          <div style={{ fontSize: 12, color: T.textTertiary }}>
            登入以管理你的客戶與商機
          </div>
        </div>

        <div>
          <label
            style={{
              display: "block",
              fontSize: 12,
              fontWeight: 600,
              color: T.textSecondary,
              marginBottom: 6,
            }}
          >
            選擇帳號
          </label>
          <select
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            style={{
              ...s.input,
              padding: "10px 12px",
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            {REPS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            style={{
              display: "block",
              fontSize: 12,
              fontWeight: 600,
              color: T.textSecondary,
              marginBottom: 6,
            }}
          >
            密碼
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="請輸入密碼"
            autoFocus
            style={{ ...s.input, padding: "10px 12px", fontSize: 14 }}
          />
          {error && (
            <div style={{ fontSize: 11, color: "#DC2626", marginTop: 6 }}>{error}</div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            ...s.btn(true),
            justifyContent: "center",
            padding: "12px 16px",
            fontSize: 14,
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? "登入中…" : "登入"}
        </button>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 11,
            color: T.textTertiary,
            paddingTop: 4,
            borderTop: `1px dashed ${T.borderLight}`,
            marginTop: 4,
            paddingTop: 12,
          }}
        >
          <span>
            示範密碼：
            <code
              style={{
                fontFamily: T.mono,
                background: T.surfaceAlt,
                padding: "1px 6px",
                borderRadius: 3,
                color: T.text,
              }}
            >
              {DEMO_PASSWORD}
            </code>
          </span>
          <button
            type="button"
            onClick={fillDemo}
            style={{
              background: "none",
              border: "none",
              color: T.accent,
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
              padding: 0,
            }}
          >
            自動填入
          </button>
        </div>
      </form>
    </div>
  );
}
