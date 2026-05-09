import { useMemo, useState } from "react";
import {
  DEAL_STATUSES,
  PRODUCTS,
  REPS,
} from "../constants.js";
import { effectiveDealAmount, fmt, getCustomer, getProduct, getRep } from "../utils.js";
import { s } from "../styles.js";
import { T } from "../theme.js";
import { StatusBadge } from "../components/Badge.jsx";
import { DataTable, FilterRow, PageHeader } from "../components/DataTable.jsx";
import { OwnerTabs } from "../components/Tabs.jsx";
import { Drawer } from "../components/Drawer.jsx";
import { DetailRow, DetailSection } from "../components/DetailRow.jsx";
import {
  Field,
  MultiSelect,
  NumberInput,
  SearchSelect,
  SelectInput,
  TextInput,
} from "../components/fields.jsx";

const EMPTY_DEAL = {
  title: "",
  customerId: null,
  product: "consulting",
  stage: PRODUCTS[0].stages[0],
  amount: null,
  status: "進行中",
  supplierId: null,
  owner: null,
  collaborators: [],
};

export function DealsView({
  store,
  drawerSeed,
  onConsumeSeed,
  onOpenSupplier,
  onOpenQuote,
  onOpenContract,
}) {
  const { deals, customers, suppliers, quotes, contracts, currentUser } = store;
  const [tab, setTab] = useState("all");
  const [fProduct, setFProduct] = useState("all");
  const [fStatus, setFStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [drawer, setDrawer] = useState(null);

  if (drawerSeed && !drawer) {
    setDrawer(drawerSeed);
    onConsumeSeed?.();
  }

  const filtered = useMemo(() => {
    let d = deals;
    if (tab === "mine") d = d.filter((x) => x.owner === currentUser);
    if (tab === "collab") d = d.filter((x) => x.collaborators.includes(currentUser));
    if (fProduct !== "all") d = d.filter((x) => x.product === fProduct);
    if (fStatus !== "all") d = d.filter((x) => x.status === fStatus);
    if (search)
      d = d.filter(
        (x) =>
          x.title.includes(search) ||
          (getCustomer(x.customerId, customers)?.name || "").includes(search)
      );
    return d;
  }, [deals, customers, tab, fProduct, fStatus, search]);

  const current = drawer?.id ? deals.find((d) => d.id === drawer.id) : null;

  const columns = [
    {
      key: "title",
      label: "商機名稱",
      render: (r) => <span style={s.link}>{r.title}</span>,
    },
    {
      key: "customer",
      label: "關聯客戶",
      render: (r) => getCustomer(r.customerId, customers)?.name || "—",
    },
    {
      key: "product",
      label: "產品線",
      render: (r) => {
        const p = getProduct(r.product);
        return p ? <span style={s.badge(p.color, `${p.color}14`)}>{p.icon} {p.name}</span> : "—";
      },
    },
    {
      key: "stage",
      label: "階段",
      render: (r) => {
        const p = getProduct(r.product);
        return <span style={s.badge(p?.color || "#666", `${p?.color || "#666"}14`)}>{r.stage}</span>;
      },
    },
    {
      key: "amount",
      label: "金額",
      mono: true,
      render: (r) => {
        const eff = effectiveDealAmount(r, quotes);
        const derived = (r.amount == null || r.amount === "" || r.amount === 0) && eff > 0;
        return (
          <span style={{ fontWeight: 600, color: T.text }}>
            {fmt(eff)}
            {derived && (
              <span
                style={{
                  fontSize: 9,
                  color: T.textTertiary,
                  marginLeft: 4,
                  fontFamily: T.font,
                }}
              >
                (報價合計)
              </span>
            )}
          </span>
        );
      },
    },
    {
      key: "status",
      label: "狀態",
      render: (r) => <StatusBadge status={r.status} />,
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
        title="商機"
        count={filtered.length}
        addLabel="新增商機"
        onAdd={() => setDrawer({ mode: "create" })}
      />
      <OwnerTabs active={tab} onChange={setTab} />
      <FilterRow>
        <select style={s.select} value={fProduct} onChange={(e) => setFProduct(e.target.value)}>
          <option value="all">產品線：全部</option>
          {PRODUCTS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.icon} {p.name}
            </option>
          ))}
        </select>
        <select style={s.select} value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
          <option value="all">狀態：全部</option>
          {DEAL_STATUSES.map((x) => (
            <option key={x} value={x}>
              {x}
            </option>
          ))}
        </select>
        <div style={{ marginLeft: "auto" }}>
          <input
            style={{ ...s.input, width: 200, padding: "6px 10px", fontSize: 12 }}
            placeholder="搜尋商機名稱/客戶"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </FilterRow>
      <DataTable
        columns={columns}
        data={filtered}
        emptyText="找不到符合條件的商機"
        onRowClick={(r) => setDrawer({ mode: "detail", id: r.id })}
      />

      {drawer?.mode === "detail" && current && (
        <DealDetailDrawer
          deal={current}
          customers={customers}
          suppliers={suppliers}
          quotes={quotes.filter((q) => q.dealId === current.id)}
          contracts={contracts.filter((k) => k.dealId === current.id)}
          onOpenSupplier={onOpenSupplier}
          onOpenQuote={onOpenQuote}
          onOpenContract={onOpenContract}
          onClose={() => setDrawer(null)}
          onEdit={() => setDrawer({ mode: "edit", id: current.id })}
          onDelete={async () => {
            if (!confirm(`確定刪除商機「${current.title}」？`)) return;
            try {
              await store.removeItem("deals", current.id);
              setDrawer(null);
            } catch (err) {
              alert(err.message || "刪除失敗");
            }
          }}
        />
      )}

      {(drawer?.mode === "create" || drawer?.mode === "edit") && (
        <DealFormDrawer
          initial={drawer.mode === "edit" ? current : { ...EMPTY_DEAL, owner: currentUser }}
          mode={drawer.mode}
          customers={customers}
          suppliers={suppliers}
          onClose={() => setDrawer(null)}
          onSubmit={async (data) => {
            try {
              if (drawer.mode === "edit") {
                await store.updateItem("deals", current.id, data);
                setDrawer({ mode: "detail", id: current.id });
              } else {
                const created = await store.addItem("deals", data);
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

function DealDetailDrawer({
  deal,
  customers,
  suppliers,
  quotes,
  contracts,
  onOpenSupplier,
  onOpenQuote,
  onOpenContract,
  onClose,
  onEdit,
  onDelete,
}) {
  const cust = getCustomer(deal.customerId, customers);
  const product = getProduct(deal.product);
  const supplier = deal.supplierId
    ? suppliers?.find((sp) => sp.id === deal.supplierId)
    : null;
  const explicit =
    deal.amount != null && deal.amount !== "" && Number(deal.amount) > 0;
  const eff = effectiveDealAmount(deal, quotes);
  return (
    <Drawer
      open
      title={`商機 · ${deal.title}`}
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
        <DetailRow label="商機名稱">{deal.title}</DetailRow>
        <DetailRow label="關聯客戶">{cust?.name}</DetailRow>
        <DetailRow label="產品線">
          {product && (
            <span style={s.badge(product.color, `${product.color}14`)}>
              {product.icon} {product.name}
            </span>
          )}
        </DetailRow>
        <DetailRow label="階段">
          {product && (
            <span style={s.badge(product.color, `${product.color}14`)}>{deal.stage}</span>
          )}
        </DetailRow>
        <DetailRow label={explicit ? "預估金額" : "金額"}>
          <span style={{ fontFamily: T.mono, fontWeight: 700 }}>{fmt(eff)}</span>
          {!explicit && eff > 0 && (
            <span
              style={{
                marginLeft: 6,
                fontSize: 11,
                color: T.textTertiary,
              }}
            >
              （已接受報價合計）
            </span>
          )}
        </DetailRow>
        <DetailRow label="狀態">
          <StatusBadge status={deal.status} />
        </DetailRow>
        {supplier && (
          <DetailRow label="供應商">
            <button
              onClick={() => onOpenSupplier?.(supplier.id)}
              style={{ ...s.link, background: "none", border: "none", padding: 0 }}
            >
              {supplier.name}
            </button>
            <span style={{ marginLeft: 6, color: T.textTertiary, fontSize: 11 }}>
              · {supplier.type}
            </span>
          </DetailRow>
        )}
      </DetailSection>
      <DetailSection title="負責人">
        <DetailRow label="負責人">{getRep(deal.owner)?.name}</DetailRow>
        <DetailRow label="協作人">
          {deal.collaborators.length
            ? deal.collaborators.map((id) => getRep(id)?.name).join("、")
            : null}
        </DetailRow>
        <DetailRow label="創建時間">
          <span style={{ fontFamily: T.mono }}>{deal.created}</span>
        </DetailRow>
      </DetailSection>

      <DetailSection title={`報價單（${quotes?.length || 0}）`}>
        {(quotes || []).length === 0 ? (
          <div style={{ fontSize: 12, color: T.textTertiary }}>暫無</div>
        ) : (
          quotes.map((q) => (
            <button
              key={q.id}
              onClick={() => onOpenQuote?.(q.id)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "8px 10px",
                border: `1px solid ${T.borderLight}`,
                borderRadius: 5,
                background: T.surface,
                marginBottom: 6,
                cursor: "pointer",
                fontFamily: T.font,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>
                  {q.title}
                </div>
                <StatusBadge status={q.status} />
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: T.textTertiary,
                  fontFamily: T.mono,
                  marginTop: 2,
                }}
              >
                {fmt((q.items || []).reduce(
                  (s, it) => s + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0),
                  Number(q.amount) || 0
                ))} · {q.created}
              </div>
            </button>
          ))
        )}
      </DetailSection>

      <DetailSection title={`合同（${contracts?.length || 0}）`}>
        {(contracts || []).length === 0 ? (
          <div style={{ fontSize: 12, color: T.textTertiary }}>暫無</div>
        ) : (
          contracts.map((k) => (
            <button
              key={k.id}
              onClick={() => onOpenContract?.(k.id)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "8px 10px",
                border: `1px solid ${T.borderLight}`,
                borderRadius: 5,
                background: T.surface,
                marginBottom: 6,
                cursor: "pointer",
                fontFamily: T.font,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>
                  {k.title}
                </div>
                <StatusBadge status={k.status} />
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: T.textTertiary,
                  fontFamily: T.mono,
                  marginTop: 2,
                }}
              >
                {fmt((k.items || []).reduce(
                  (s, it) => s + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0),
                  Number(k.amount) || 0
                ))} · {k.signDate || k.created}
              </div>
            </button>
          ))
        )}
      </DetailSection>
    </Drawer>
  );
}

export function DealFormDrawer({ initial, mode, customers, suppliers, onClose, onSubmit }) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const product = getProduct(form.product);
  const stages = product?.stages || [];

  const validate = () => {
    const e = {};
    if (!form.title?.trim()) e.title = "請輸入商機名稱";
    if (!form.customerId) e.customerId = "請選擇關聯客戶";
    if (form.amount != null && form.amount !== "" && form.amount < 0)
      e.amount = "金額不可為負數";
    if (!stages.includes(form.stage)) e.stage = "請選擇階段";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  return (
    <Drawer
      open
      title={mode === "edit" ? "編輯商機" : "新增商機"}
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
      <Field label="商機名稱" required error={errors.title}>
        <TextInput value={form.title} onChange={(v) => set("title", v)} />
      </Field>
      <Field label="關聯客戶" required error={errors.customerId}>
        <SearchSelect
          value={form.customerId}
          onChange={(v) => set("customerId", v)}
          placeholder="搜尋商戶名稱"
          emptyText="請先建立客戶"
          options={customers.map((c) => ({ value: c.id, label: c.name }))}
        />
      </Field>
      <Field label="產品線">
        <SelectInput
          value={form.product}
          onChange={(v) => {
            const p = getProduct(v);
            setForm((f) => ({ ...f, product: v, stage: p?.stages[0] || "" }));
          }}
          options={PRODUCTS.map((p) => ({ value: p.id, label: `${p.icon} ${p.name}` }))}
        />
      </Field>
      <Field label="階段" error={errors.stage}>
        <SelectInput value={form.stage} onChange={(v) => set("stage", v)} options={stages} />
      </Field>
      <Field
        label="預估金額（MOP）"
        hint="留空時自動取「已接受報價」的合計金額"
        error={errors.amount}
      >
        <NumberInput value={form.amount} onChange={(v) => set("amount", v)} />
      </Field>
      <Field label="狀態">
        <SelectInput
          value={form.status}
          onChange={(v) => set("status", v)}
          options={DEAL_STATUSES}
        />
      </Field>
      <Field label="供應商">
        <SearchSelect
          value={form.supplierId}
          onChange={(v) => set("supplierId", v)}
          placeholder="搜尋供應商（可選）"
          emptyText="請先建立啟用的供應商"
          options={(suppliers || [])
            .filter((sp) => sp.status === "啟用")
            .map((sp) => ({ value: sp.id, label: `${sp.name}（${sp.type}）` }))}
        />
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
