import { useMemo, useState } from "react";
import { QUOTE_STATUSES, REPS } from "../constants.js";
import { fmt, getCustomer, getDeal, getRep } from "../utils.js";
import { s } from "../styles.js";
import { T } from "../theme.js";
import { StatusBadge } from "../components/Badge.jsx";
import { DataTable, FilterRow, PageHeader } from "../components/DataTable.jsx";
import { OwnerTabs } from "../components/Tabs.jsx";
import { Drawer } from "../components/Drawer.jsx";
import { DetailRow, DetailSection } from "../components/DetailRow.jsx";
import {
  DateInput,
  Field,
  MultiSelect,
  SearchSelect,
  SelectInput,
  TextInput,
} from "../components/fields.jsx";
import {
  emptyLineItem,
  LineItemsEditor,
  totalsFor,
} from "../components/LineItemsEditor.jsx";

const EMPTY_QUOTE = {
  title: "",
  customerId: null,
  dealId: null,
  items: [],
  status: "草稿",
  validUntil: null,
  owner: null,
  collaborators: [],
};

// Old quotes (created before line items existed) only have a flat `amount`.
// Treat them as a single line item so the form works.
function normalizeQuote(q) {
  if (q.items && q.items.length > 0) return q;
  if (q.amount && q.amount > 0) {
    return {
      ...q,
      items: [
        {
          ...emptyLineItem(),
          name: q.title || "",
          quantity: 1,
          unitPrice: q.amount,
        },
      ],
    };
  }
  return { ...q, items: [] };
}

function quoteAmount(q) {
  if (q.items && q.items.length > 0) return totalsFor(q.items).total;
  return q.amount || 0;
}

export function QuotesView({ store }) {
  const { quotes, customers, deals, pricings, currentUser } = store;
  const [tab, setTab] = useState("all");
  const [fStatus, setFStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [drawer, setDrawer] = useState(null);

  const filtered = useMemo(() => {
    let d = quotes;
    if (tab === "mine") d = d.filter((x) => x.owner === currentUser);
    if (tab === "collab") d = d.filter((x) => x.collaborators.includes(currentUser));
    if (fStatus !== "all") d = d.filter((x) => x.status === fStatus);
    if (search)
      d = d.filter(
        (x) =>
          x.title.includes(search) ||
          (getCustomer(x.customerId, customers)?.name || "").includes(search)
      );
    return d;
  }, [quotes, customers, tab, fStatus, search]);

  const current = drawer?.id ? quotes.find((q) => q.id === drawer.id) : null;

  const columns = [
    {
      key: "title",
      label: "報價單名稱",
      render: (r) => (
        <span
          style={{
            ...s.link,
            maxWidth: 240,
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "inline-block",
            whiteSpace: "nowrap",
            verticalAlign: "bottom",
          }}
        >
          {r.title}
        </span>
      ),
    },
    {
      key: "customer",
      label: "關聯客戶",
      render: (r) => getCustomer(r.customerId, customers)?.name || "—",
    },
    {
      key: "amount",
      label: "報價金額",
      mono: true,
      render: (r) => <span style={{ fontWeight: 600, color: T.text }}>{fmt(quoteAmount(r))}</span>,
    },
    {
      key: "status",
      label: "狀態",
      render: (r) => <StatusBadge status={r.status} />,
    },
    { key: "validUntil", label: "有效期限", mono: true },
    {
      key: "owner",
      label: "負責人",
      render: (r) => getRep(r.owner)?.name || "—",
    },
    { key: "created", label: "創建時間", mono: true },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <PageHeader
        title="報價單"
        count={filtered.length}
        addLabel="新增報價單"
        onAdd={() => setDrawer({ mode: "create" })}
      />
      <OwnerTabs active={tab} onChange={setTab} />
      <FilterRow>
        <select style={s.select} value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
          <option value="all">狀態：全部</option>
          {QUOTE_STATUSES.map((x) => (
            <option key={x} value={x}>
              {x}
            </option>
          ))}
        </select>
        <div style={{ marginLeft: "auto" }}>
          <input
            style={{ ...s.input, width: 200, padding: "6px 10px", fontSize: 12 }}
            placeholder="搜尋報價單/客戶"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </FilterRow>
      <DataTable
        columns={columns}
        data={filtered}
        emptyText="找不到符合條件的報價單"
        onRowClick={(r) => setDrawer({ mode: "detail", id: r.id })}
      />

      {drawer?.mode === "detail" && current && (
        <QuoteDetailDrawer
          quote={normalizeQuote(current)}
          customers={customers}
          deals={deals}
          onClose={() => setDrawer(null)}
          onEdit={() => setDrawer({ mode: "edit", id: current.id })}
          onDelete={async () => {
            if (!confirm(`確定刪除報價單「${current.title}」？`)) return;
            try {
              await store.removeItem("quotes", current.id);
              setDrawer(null);
            } catch (err) {
              alert(err.message || "刪除失敗");
            }
          }}
        />
      )}

      {(drawer?.mode === "create" || drawer?.mode === "edit") && (
        <QuoteFormDrawer
          initial={
            drawer.mode === "edit"
              ? normalizeQuote(current)
              : { ...EMPTY_QUOTE, owner: currentUser }
          }
          mode={drawer.mode}
          customers={customers}
          deals={deals}
          pricings={pricings}
          onClose={() => setDrawer(null)}
          onSubmit={async (data) => {
            try {
              if (drawer.mode === "edit") {
                await store.updateItem("quotes", current.id, data);
                setDrawer({ mode: "detail", id: current.id });
              } else {
                const created = await store.addItem("quotes", data);
                setDrawer({ mode: "detail", id: created.id });
              }
            } catch (err) {
              alert(err.message || "儲存失敗");
            }
          }}
        />
      )}
    </div>
  );
}

function QuoteDetailDrawer({ quote, customers, deals, onClose, onEdit, onDelete }) {
  const cust = getCustomer(quote.customerId, customers);
  const deal = getDeal(quote.dealId, deals);
  const items = quote.items || [];
  const { total, totalCost, margin } = totalsFor(items);
  return (
    <Drawer
      open
      title={`報價單 · ${quote.title}`}
      onClose={onClose}
      footer={
        <>
          <button onClick={onDelete} style={s.btnDanger}>
            刪除
          </button>
          <div style={{ flex: 1 }} />
          <button onClick={onEdit} style={s.btn(true)}>
            編輯
          </button>
        </>
      }
    >
      <DetailSection title="基本資料">
        <DetailRow label="報價單名稱">{quote.title}</DetailRow>
        <DetailRow label="關聯客戶">{cust?.name}</DetailRow>
        <DetailRow label="關聯商機">{deal?.title}</DetailRow>
        <DetailRow label="狀態">
          <StatusBadge status={quote.status} />
        </DetailRow>
        <DetailRow label="有效期限">
          <span style={{ fontFamily: T.mono }}>{quote.validUntil}</span>
        </DetailRow>
      </DetailSection>

      <DetailSection title={`收費項目（${items.length}）`}>
        {items.length === 0 ? (
          <div style={{ fontSize: 12, color: T.textTertiary }}>暫無項目</div>
        ) : (
          items.map((it, idx) => (
            <div
              key={it.id || idx}
              style={{
                padding: "8px 10px",
                border: `1px solid ${T.borderLight}`,
                borderLeft: `3px solid ${T.accent}40`,
                borderRadius: T.radiusSm,
                marginBottom: 6,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>
                {it.name || "（未命名）"}
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: 3,
                  fontSize: 12,
                  color: T.textSecondary,
                  fontFamily: T.mono,
                }}
              >
                <span>
                  {it.quantity} × {fmt(it.unitPrice)}
                  {it.billingType && it.billingType !== "一次性" && (
                    <span style={{ marginLeft: 6, fontSize: 10, color: T.textTertiary }}>
                      / {it.billingType}
                    </span>
                  )}
                </span>
                <span style={{ fontWeight: 700, color: T.text }}>
                  {fmt((Number(it.quantity) || 0) * (Number(it.unitPrice) || 0))}
                </span>
              </div>
            </div>
          ))
        )}
        <div
          style={{
            marginTop: 8,
            padding: "10px 12px",
            background: T.surfaceAlt,
            borderRadius: T.radiusSm,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
          }}
        >
          <span style={{ fontSize: 12, color: T.textSecondary }}>合計</span>
          <span
            style={{
              fontFamily: T.mono,
              fontSize: 18,
              fontWeight: 800,
              color: T.accent,
            }}
          >
            {fmt(total)}
          </span>
        </div>
      </DetailSection>

      <div
        style={{
          marginTop: 18,
          padding: "10px 12px",
          background: "#FEF3C7",
          border: "1px solid #FCD34D",
          borderRadius: T.radiusSm,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "#92400E",
            letterSpacing: 1.5,
            textTransform: "uppercase",
            marginBottom: 6,
          }}
        >
          🔒 內部 — 成本 / 毛利
        </div>
        <DetailRow label="總成本">
          <span style={{ fontFamily: T.mono }}>{fmt(totalCost)}</span>
        </DetailRow>
        <DetailRow label="毛利">
          <span
            style={{
              fontFamily: T.mono,
              fontWeight: 700,
              color: margin > 0 ? "#059669" : "#DC2626",
            }}
          >
            {fmt(margin)} ({total > 0 ? Math.round((margin / total) * 100) : 0}%)
          </span>
        </DetailRow>
      </div>

      <DetailSection title="負責人">
        <DetailRow label="負責人">{getRep(quote.owner)?.name}</DetailRow>
        <DetailRow label="協作人">
          {quote.collaborators.length
            ? quote.collaborators.map((id) => getRep(id)?.name).join("、")
            : null}
        </DetailRow>
        <DetailRow label="創建時間">
          <span style={{ fontFamily: T.mono }}>{quote.created}</span>
        </DetailRow>
      </DetailSection>
    </Drawer>
  );
}

function QuoteFormDrawer({ initial, mode, customers, deals, pricings, onClose, onSubmit }) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const dealOptions = form.customerId
    ? deals.filter((d) => d.customerId === form.customerId)
    : deals;

  const validate = () => {
    const e = {};
    if (!form.title?.trim()) e.title = "請輸入報價單名稱";
    if (!form.customerId) e.customerId = "請選擇客戶";
    if (!form.items || form.items.length === 0)
      e.items = "請至少加入一個收費項目";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  return (
    <Drawer
      open
      title={mode === "edit" ? "編輯報價單" : "新增報價單"}
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} style={s.btn(false)}>
            取消
          </button>
          <button
            onClick={async () => {
              if (submitting || !validate()) return;
              setSubmitting(true);
              try { await onSubmit(form); }
              finally { setSubmitting(false); }
            }}
            disabled={submitting}
            style={{ ...s.btn(true), opacity: submitting ? 0.6 : 1 }}
          >
            {submitting ? "儲存中…" : mode === "edit" ? "儲存" : "建立"}
          </button>
        </>
      }
    >
      <Field label="報價單名稱" required error={errors.title}>
        <TextInput value={form.title} onChange={(v) => set("title", v)} />
      </Field>
      <Field label="關聯客戶" required error={errors.customerId}>
        <SearchSelect
          value={form.customerId}
          onChange={(v) => setForm((f) => ({ ...f, customerId: v, dealId: null }))}
          placeholder="搜尋商戶名稱"
          emptyText="請先建立客戶"
          options={customers.map((c) => ({ value: c.id, label: c.name }))}
        />
      </Field>
      <Field label="關聯商機">
        <SearchSelect
          value={form.dealId}
          onChange={(v) => set("dealId", v)}
          placeholder="搜尋商機名稱（可選）"
          emptyText="此客戶下沒有商機"
          options={dealOptions.map((d) => ({ value: d.id, label: d.title }))}
        />
      </Field>
      <Field label="收費項目" required error={errors.items}>
        <LineItemsEditor
          items={form.items}
          onChange={(items) => set("items", items)}
          pricings={pricings}
        />
      </Field>
      <Field label="狀態">
        <SelectInput
          value={form.status}
          onChange={(v) => set("status", v)}
          options={QUOTE_STATUSES}
        />
      </Field>
      <Field label="有效期限">
        <DateInput value={form.validUntil} onChange={(v) => set("validUntil", v)} />
      </Field>
      <Field label="負責人">
        <SelectInput
          value={form.owner}
          onChange={(v) => set("owner", v)}
          options={REPS.map((r) => ({ value: r.id, label: r.name }))}
        />
      </Field>
      <Field label="協作人">
        <MultiSelect
          value={form.collaborators}
          onChange={(v) => set("collaborators", v)}
          options={REPS.filter((r) => r.id !== form.owner).map((r) => ({
            value: r.id,
            label: r.name,
          }))}
        />
      </Field>
    </Drawer>
  );
}
