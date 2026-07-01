import { useState } from "react";
import { ACTIVITY_KINDS } from "../constants.js";
import { getRep, today } from "../utils.js";
import { T } from "../theme.js";
import { s } from "../styles.js";
import { toast } from "./Toast.jsx";
import { DateInput, SelectInput, TextArea } from "./fields.jsx";

const KIND_ICON = {
  電話: "📞",
  拜訪: "🤝",
  會議: "📅",
  Email: "✉️",
  訊息: "💬",
  備註: "📝",
};

// 跟進紀錄面板。embed 在 detail drawer 裡,顯示某筆紀錄的活動時間軸,
// 可記錄「已完成」或「計劃下一步(待辦)」,並標示逾期。
export function ActivityPanel({ store, relatedType, relatedId }) {
  const list = (store.activities || [])
    .filter((a) => a.relatedType === relatedType && a.relatedId === relatedId)
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  const [form, setForm] = useState(null); // null | { kind, date, note, done }
  const [busy, setBusy] = useState(false);

  const startAdd = (done) =>
    setForm({ kind: "電話", date: today(), note: "", done });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await store.addItem("activities", {
        relatedType,
        relatedId,
        kind: form.kind,
        date: form.date || today(),
        note: form.note || "",
        done: !!form.done,
        owner: store.currentUser,
      });
      setForm(null);
      toast(form.done ? "已記錄跟進" : "已新增待辦", "success");
    } catch (e) {
      toast(e.message || "儲存失敗");
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (a) => {
    try {
      await store.updateItem("activities", a.id, { done: !a.done });
    } catch (e) {
      toast(e.message || "更新失敗");
    }
  };
  const del = async (a) => {
    try {
      await store.removeItem("activities", a.id);
    } catch (e) {
      toast(e.message || "刪除失敗");
    }
  };

  const t = today();

  return (
    <div>
      {!form && (
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <button type="button" onClick={() => startAdd(true)} style={s.btn(false)}>
            ＋ 記錄跟進
          </button>
          <button type="button" onClick={() => startAdd(false)} style={s.btn(false)}>
            ＋ 計劃下一步
          </button>
        </div>
      )}

      {form && (
        <div
          style={{
            border: `1px solid ${T.border}`,
            borderRadius: T.radiusSm,
            padding: 10,
            marginBottom: 10,
            background: T.surfaceAlt,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 8 }}>
            {form.done ? "記錄一筆跟進" : "計劃下一步(待辦)"}
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <div style={{ flex: 1 }}>
              <SelectInput
                value={form.kind}
                onChange={(v) => set("kind", v)}
                options={ACTIVITY_KINDS}
              />
            </div>
            <div style={{ flex: 1 }}>
              <DateInput value={form.date} onChange={(v) => set("date", v || today())} />
            </div>
          </div>
          <TextArea
            value={form.note}
            onChange={(v) => set("note", v)}
            placeholder={form.done ? "聊了什麼、結果如何…" : "下一步要做什麼…"}
          />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button type="button" onClick={() => setForm(null)} style={s.btn(false)}>
              取消
            </button>
            <div style={{ flex: 1 }} />
            <button
              type="button"
              onClick={save}
              disabled={busy}
              style={{ ...s.btn(true), opacity: busy ? 0.6 : 1 }}
            >
              {busy ? "儲存中…" : "儲存"}
            </button>
          </div>
        </div>
      )}

      {list.length === 0 ? (
        <div style={{ fontSize: 12, color: T.textTertiary }}>暫無跟進紀錄</div>
      ) : (
        list.map((a) => {
          const overdue = !a.done && a.date && a.date < t;
          return (
            <div
              key={a.id}
              style={{
                padding: "8px 10px",
                border: `1px solid ${T.borderLight}`,
                borderLeft: `3px solid ${
                  a.done ? T.borderLight : overdue ? "#DC2626" : "#D97706"
                }`,
                borderRadius: 5,
                marginBottom: 6,
                background: T.surface,
              }}
            >
              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <span style={{ fontSize: 13 }}>{KIND_ICON[a.kind] || "📝"}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>
                  {a.kind}
                </span>
                {!a.done && (
                  <span style={s.badge(overdue ? "#DC2626" : "#D97706", overdue ? "#FEE2E2" : "#FEF3C7")}>
                    {overdue ? "逾期待辦" : "待辦"}
                  </span>
                )}
                <span
                  style={{
                    marginLeft: "auto",
                    fontSize: 11,
                    color: overdue ? "#DC2626" : T.textTertiary,
                    fontFamily: T.mono,
                  }}
                >
                  {a.date}
                </span>
              </div>
              {a.note && (
                <div style={{ fontSize: 12, color: T.textSecondary, marginTop: 4, whiteSpace: "pre-wrap" }}>
                  {a.note}
                </div>
              )}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginTop: 6,
                  fontSize: 11,
                  color: T.textTertiary,
                }}
              >
                <span>{getRep(a.owner)?.name || "—"}</span>
                <div style={{ flex: 1 }} />
                <button
                  type="button"
                  onClick={() => toggle(a)}
                  style={{ ...linkBtn, color: a.done ? T.textTertiary : "#059669" }}
                >
                  {a.done ? "標為待辦" : "✓ 完成"}
                </button>
                <button type="button" onClick={() => del(a)} style={{ ...linkBtn, color: "#DC2626" }}>
                  刪除
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

const linkBtn = {
  background: "none",
  border: "none",
  padding: 0,
  cursor: "pointer",
  fontSize: 11,
  fontWeight: 600,
  fontFamily: "inherit",
};
