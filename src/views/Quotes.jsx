import { useMemo, useState } from "react";
import { toast } from "../components/Toast.jsx";
import { CURRENCIES, DEFAULT_CURRENCY, PRODUCTS, QUOTE_STATUSES, REPS } from "../constants.js";
import { fmt, getCustomer, getDeal, getRep, indexById, today } from "../utils.js";

// 報價單是否已過有效期限（且尚未走到接受/拒絕/過期等終態）
function isQuoteExpired(q) {
  return (
    q.validUntil &&
    q.validUntil < today() &&
    !["已接受", "已拒絕", "已過期"].includes(q.status)
  );
}
import { s } from "../styles.js";
import { T } from "../theme.js";
import { StatusBadge } from "../components/Badge.jsx";
import { DataTable, FilterRow, PageHeader } from "../components/DataTable.jsx";
import { OwnerTabs } from "../components/Tabs.jsx";
import { Drawer } from "../components/Drawer.jsx";
import { DetailRow, DetailSection } from "../components/DetailRow.jsx";
import { QuotePrintView } from "../components/QuotePrintView.jsx";
import {
  DateInput,
  Field,
  MultiSelect,
  SearchSelect,
  SelectInput,
  TextInput,
} from "../components/fields.jsx";
import {
  AddOnsEditor,
  emptyLineItem,
  LineItemsEditor,
  totalsFor,
} from "../components/LineItemsEditor.jsx";
import { ADDON_PRESETS } from "../constants.js";
import { quoteBreakdown } from "../utils.js";

const EMPTY_QUOTE = {
  title: "",
  customerId: null,
  dealId: null,
  currency: DEFAULT_CURRENCY,
  items: [],
  addOns: [],
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

export function QuotesView({ store, drawerSeed, onConsumeSeed }) {
  const { quotes, customers, deals, contracts, pricings, currentUser } = store;
  const [tab, setTab] = useState("all");
  const [fStatus, setFStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [drawer, setDrawer] = useState(null);

  if (drawerSeed && !drawer) {
    setDrawer(drawerSeed);
    onConsumeSeed?.();
  }

  const customerById = useMemo(() => indexById(customers), [customers]);

  const filtered = useMemo(() => {
    let d = quotes;
    if (tab === "mine") d = d.filter((x) => x.owner === currentUser);
    if (tab === "collab") d = d.filter((x) => x.collaborators.includes(currentUser));
    if (fStatus !== "all") d = d.filter((x) => x.status === fStatus);
    if (search)
      d = d.filter(
        (x) =>
          x.title.includes(search) ||
          (customerById.get(x.customerId)?.name || "").includes(search)
      );
    return d;
  }, [quotes, customerById, tab, fStatus, search, currentUser]);

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
      render: (r) => customerById.get(r.customerId)?.name || "—",
    },
    {
      key: "amount",
      label: "報價金額",
      mono: true,
      render: (r) => (
        <span style={{ fontWeight: 600, color: T.text }}>
          {fmt(quoteAmount(r), r.currency || DEFAULT_CURRENCY)}
        </span>
      ),
    },
    {
      key: "status",
      label: "狀態",
      render: (r) => (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <StatusBadge status={r.status} />
          {isQuoteExpired(r) && (
            <span style={s.badge("#DC2626", "#FEE2E2")}>已過期</span>
          )}
        </span>
      ),
    },
    {
      key: "validUntil",
      label: "有效期限",
      mono: true,
      render: (r) =>
        r.validUntil ? (
          <span style={{ color: isQuoteExpired(r) ? "#DC2626" : T.text, fontFamily: T.mono }}>
            {r.validUntil}
          </span>
        ) : (
          <span style={{ color: T.textTertiary }}>—</span>
        ),
    },
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
          onConvertToContract={async () => {
            const existing = (contracts || []).find((k) => k.quoteId === current.id);
            if (
              existing &&
              !confirm(
                `此報價已建立過合同「${existing.title}」（${existing.status}）。\n仍要再建立一份新的合同草稿嗎？`
              )
            )
              return;
            if (
              !existing &&
              !confirm(`要用此報價單建立一份合同草稿嗎？（會帶入全部收費項目）`)
            )
              return;
            try {
              await store.addItem("contracts", {
                title: current.title,
                customerId: current.customerId,
                dealId: current.dealId || null,
                quoteId: current.id,
                currency: current.currency || DEFAULT_CURRENCY,
                items: current.items || [],
                addOns: current.addOns || [],
                status: "草稿",
                owner: current.owner || currentUser,
                collaborators: current.collaborators || [],
              });
              toast("已建立合同草稿（在「合同」頁查看）", "success");
            } catch (err) {
              toast(err.message || "建立合同失敗");
            }
          }}
          onDelete={async () => {
            if (!confirm(`確定刪除報價單「${current.title}」？`)) return;
            try {
              await store.removeItem("quotes", current.id);
              setDrawer(null);
            } catch (err) {
              toast(err.message || "刪除失敗");
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
              const wasAccepted = drawer.mode === "edit" && current?.status === "已接受";
              const nowAccepted = data.status === "已接受";
              let saved;
              if (drawer.mode === "edit") {
                saved = await store.updateItem("quotes", current.id, data);
              } else {
                saved = await store.addItem("quotes", data);
              }
              setDrawer({ mode: "detail", id: saved.id });

              // Quote just transitioned to 已接受 → offer to advance the deal stage
              if (!wasAccepted && nowAccepted && saved.dealId) {
                const deal = deals.find((d) => d.id === saved.dealId);
                if (deal && deal.status === "進行中") {
                  const product = PRODUCTS.find((p) => p.id === deal.product);
                  const stages = product?.stages || [];
                  const idx = stages.indexOf(deal.stage);
                  const next = idx >= 0 && idx < stages.length - 1 ? stages[idx + 1] : null;
                  if (
                    next &&
                    confirm(
                      `報價已接受 ✅\n\n要把商機「${deal.title}」從「${deal.stage}」推進到「${next}」嗎？`
                    )
                  ) {
                    await store.moveDealStage(deal.id, next);
                  }
                }
              }
            } catch (err) {
              toast(err.message || "儲存失敗");
            }
          }}
        />
      )}
    </div>
  );
}

function QuoteDetailDrawer({ quote, customers, deals, onClose, onEdit, onDelete, onConvertToContract }) {
  const cust = getCustomer(quote.customerId, customers);
  const deal = getDeal(quote.dealId, deals);
  const items = quote.items || [];
  const addOns = quote.addOns || [];
  const currency = quote.currency || DEFAULT_CURRENCY;
  const b = quoteBreakdown(quote);
  const [printOpen, setPrintOpen] = useState(false);
  return (
    <>
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
          {onConvertToContract && (
            <button onClick={onConvertToContract} style={s.btn(false)}>
              轉為合同
            </button>
          )}
          <button onClick={() => setPrintOpen(true)} style={s.btn(false)}>
            🖨 列印 / PDF
          </button>
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
      </DetailSection>

      <DetailSection title="價格分解">
        <BreakdownPanel breakdown={b} addOns={addOns} currency={currency} />
      </DetailSection>

      <SummaryCards items={items} breakdown={b} currency={currency} />


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
          <span style={{ fontFamily: T.mono }}>{fmt(b.totalCost, currency)}</span>
        </DetailRow>
        <DetailRow label="毛利">
          <span
            style={{
              fontFamily: T.mono,
              fontWeight: 700,
              color: b.margin > 0 ? "#059669" : "#DC2626",
            }}
          >
            {fmt(b.margin, currency)} ({b.total > 0 ? Math.round((b.margin / b.total) * 100) : 0}%)
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
    {printOpen && (
      <QuotePrintView
        record={quote}
        kind="quote"
        customers={customers}
        onClose={() => setPrintOpen(false)}
      />
    )}
    </>
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
      <Field label="貨幣">
        <SelectInput
          value={form.currency || DEFAULT_CURRENCY}
          onChange={(v) => set("currency", v)}
          options={CURRENCIES}
        />
      </Field>
      <Field label="收費項目" required error={errors.items}>
        <LineItemsEditor
          items={form.items}
          onChange={(items) => set("items", items)}
          pricings={pricings}
          currency={form.currency || DEFAULT_CURRENCY}
        />
      </Field>
      <Field label="套餐優惠 / 加值費" hint="折扣會疊加到項目小計，加值費分開算進總承諾">
        <AddOnsEditor
          addOns={form.addOns}
          onChange={(addOns) => set("addOns", addOns)}
          presets={ADDON_PRESETS}
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

function BreakdownPanel({ breakdown, addOns, currency = DEFAULT_CURRENCY }) {
  const b = breakdown;
  return (
    <div
      style={{
        padding: "12px 14px",
        background: T.surfaceAlt,
        borderRadius: T.radiusSm,
        fontFamily: T.font,
      }}
    >
      <Row label="原價" value={fmt(b.subtotal, currency)} mono />
      {b.lineDiscount > 0 && (
        <Row
          label="項目折扣"
          value={`−${fmt(b.lineDiscount, currency)}`}
          mono
          color="#059669"
        />
      )}
      {(addOns || [])
        .filter((a) => a.kind === "discount" && Number(a.amount) > 0)
        .map((a) => {
          const amt = b.afterLineDiscount * (Number(a.amount) / 100);
          return (
            <Row
              key={a.id}
              label={`${a.name || "折扣"} −${a.amount}%`}
              value={`−${fmt(amt, currency)}`}
              mono
              color="#059669"
            />
          );
        })}
      <div
        style={{
          borderTop: `1px solid ${T.border}`,
          marginTop: 6,
          paddingTop: 6,
        }}
      />
      <Row label="應收（年費）" value={fmt(b.total, currency)} mono bold accent />
      {(addOns || [])
        .filter((a) => a.kind === "fee" && Number(a.amount) > 0)
        .map((a) => (
          <Row
            key={a.id}
            label={a.name || "加值費"}
            value={fmt(Number(a.amount), currency)}
            mono
            color="#D97706"
          />
        ))}
      {b.addOnFee > 0 && (
        <>
          <div
            style={{
              borderTop: `1px solid ${T.border}`,
              marginTop: 6,
              paddingTop: 6,
            }}
          />
          <Row label="總承諾" value={fmt(b.totalCommitment, currency)} mono bold />
        </>
      )}
    </div>
  );
}

function Row({ label, value, mono, bold, accent, color }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        padding: "4px 0",
        fontSize: 13,
      }}
    >
      <span style={{ color: T.textSecondary }}>{label}</span>
      <span
        style={{
          fontFamily: mono ? T.mono : T.font,
          fontWeight: bold ? 800 : 600,
          color: color || (accent ? T.accent : T.text),
          fontSize: bold ? 16 : 13,
        }}
      >
        {value}
      </span>
    </div>
  );
}

function SummaryCards({ items, breakdown, currency = DEFAULT_CURRENCY }) {
  const b = breakdown;
  const storeCount = (items || []).reduce(
    (sum, it) => sum + (Number(it.quantity) || 0),
    0
  );
  const perUnit = storeCount > 0 ? b.total / storeCount : 0;
  const cards = [
    { label: "應收（年費）", value: fmt(b.total, currency), color: T.accent },
    {
      label: storeCount > 0 ? `平均每單位（${storeCount}）` : "平均每單位",
      value: storeCount > 0 ? fmt(perUnit, currency) : "—",
      color: "#2563EB",
    },
    {
      label: "加值費",
      value: b.addOnFee > 0 ? fmt(b.addOnFee, currency) : "—",
      color: "#D97706",
    },
    {
      label: "總承諾",
      value: fmt(b.totalCommitment, currency),
      color: "#7C3AED",
    },
  ];
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: 6,
        marginTop: 12,
      }}
    >
      {cards.map((c) => (
        <div
          key={c.label}
          style={{
            background: T.surfaceAlt,
            borderRadius: T.radiusSm,
            padding: "10px 12px",
          }}
        >
          <div style={{ fontSize: 10, color: T.textTertiary, marginBottom: 4 }}>
            {c.label}
          </div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 800,
              color: c.color,
              fontFamily: T.mono,
            }}
          >
            {c.value}
          </div>
        </div>
      ))}
    </div>
  );
}
