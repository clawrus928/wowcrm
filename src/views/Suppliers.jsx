import { useMemo, useState } from "react";
import {
  PRODUCTS,
  REPS,
  SUPPLIER_STATUSES,
  SUPPLIER_TYPES,
} from "../constants.js";
import { fmt, getCustomer, getProduct, getRep, today } from "../utils.js";
import { s } from "../styles.js";
import { T } from "../theme.js";
import { StatusBadge } from "../components/Badge.jsx";
import { DataTable, FilterRow, PageHeader } from "../components/DataTable.jsx";
import { OwnerTabs } from "../components/Tabs.jsx";
import { Drawer } from "../components/Drawer.jsx";
import { DetailRow, DetailSection } from "../components/DetailRow.jsx";
import {
  Field,
  SelectInput,
  TextArea,
  TextInput,
} from "../components/fields.jsx";

const EMPTY_SUPPLIER = {
  name: "",
  type: "顧問合作方",
  contact: "",
  phone: "",
  email: "",
  paymentTerms: "",
  status: "啟用",
  notes: "",
  owner: null,
};

function getSupplierStats(supplier, deals) {
  const myDeals = deals.filter((d) => d.supplierId === supplier.id);
  const active = myDeals.filter((d) => d.status === "進行中");
  const won = myDeals.filter((d) => d.status === "已成交");
  const lost = myDeals.filter((d) => d.status === "已流失");
  const activeAmount = active.reduce((sum, d) => sum + d.amount, 0);
  const wonAmount = won.reduce((sum, d) => sum + d.amount, 0);
  return {
    deals: myDeals,
    active,
    won,
    lost,
    activeAmount,
    wonAmount,
  };
}

export function SuppliersView({
  store,
  drawerSeed,
  onConsumeSeed,
  onOpenDeal,
}) {
  const { suppliers, deals, customers, currentUser } = store;
  const [tab, setTab] = useState("all");
  const [fStatus, setFStatus] = useState("all");
  const [fType, setFType] = useState("all");
  const [search, setSearch] = useState("");
  const [drawer, setDrawer] = useState(null);

  if (drawerSeed && !drawer) {
    setDrawer(drawerSeed);
    onConsumeSeed?.();
  }

  const filtered = useMemo(() => {
    let d = suppliers;
    if (tab === "mine") d = d.filter((x) => x.owner === currentUser);
    if (fStatus !== "all") d = d.filter((x) => x.status === fStatus);
    if (fType !== "all") d = d.filter((x) => x.type === fType);
    if (search)
      d = d.filter(
        (x) => x.name.includes(search) || (x.contact || "").includes(search)
      );
    return d;
  }, [suppliers, tab, fStatus, fType, search, currentUser]);

  const current = drawer?.id ? suppliers.find((x) => x.id === drawer.id) : null;

  const columns = [
    {
      key: "name",
      label: "供應商",
      render: (r) => <span style={s.link}>{r.name}</span>,
    },
    {
      key: "type",
      label: "類型",
      render: (r) => (
        <span style={s.badge("#0EA5E9", "#E0F2FE")}>{r.type}</span>
      ),
    },
    { key: "contact", label: "聯絡人" },
    { key: "phone", label: "電話", mono: true },
    {
      key: "active",
      label: "進行中",
      mono: true,
      render: (r) => {
        const st = getSupplierStats(r, deals);
        return st.activeAmount > 0 ? (
          <span style={{ fontWeight: 600, color: "#2563EB" }}>
            {fmt(st.activeAmount)}
          </span>
        ) : (
          "—"
        );
      },
    },
    {
      key: "won",
      label: "已成交",
      mono: true,
      render: (r) => {
        const st = getSupplierStats(r, deals);
        return st.wonAmount > 0 ? (
          <span style={{ fontWeight: 600, color: "#059669" }}>
            {fmt(st.wonAmount)}
          </span>
        ) : (
          "—"
        );
      },
    },
    {
      key: "status",
      label: "狀態",
      render: (r) =>
        r.status === "啟用" ? (
          <span style={s.badge("#059669", "#D1FAE5")}>啟用</span>
        ) : (
          <span style={s.badge("#6B7280", "#F3F4F6")}>停用</span>
        ),
    },
    {
      key: "owner",
      label: "對接人",
      render: (r) => getRep(r.owner)?.name || "—",
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <PageHeader
        title="供應商"
        count={filtered.length}
        addLabel="新增供應商"
        onAdd={() => setDrawer({ mode: "create" })}
      />
      <OwnerTabs active={tab} onChange={setTab} />
      <FilterRow>
        <select
          style={s.select}
          value={fStatus}
          onChange={(e) => setFStatus(e.target.value)}
        >
          <option value="all">狀態：全部</option>
          {SUPPLIER_STATUSES.map((x) => (
            <option key={x} value={x}>
              {x}
            </option>
          ))}
        </select>
        <select
          style={s.select}
          value={fType}
          onChange={(e) => setFType(e.target.value)}
        >
          <option value="all">類型：全部</option>
          {SUPPLIER_TYPES.map((x) => (
            <option key={x} value={x}>
              {x}
            </option>
          ))}
        </select>
        <div style={{ marginLeft: "auto" }}>
          <input
            style={{ ...s.input, width: 200, padding: "6px 10px", fontSize: 12 }}
            placeholder="搜尋供應商/聯絡人"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </FilterRow>
      <DataTable
        columns={columns}
        data={filtered}
        emptyText="找不到符合條件的供應商"
        onRowClick={(r) => setDrawer({ mode: "detail", id: r.id })}
      />

      {drawer?.mode === "detail" && current && (
        <SupplierDetailDrawer
          supplier={current}
          deals={deals}
          customers={customers}
          onOpenDeal={onOpenDeal}
          onClose={() => setDrawer(null)}
          onEdit={() => setDrawer({ mode: "edit", id: current.id })}
          onDelete={() => {
            if (confirm(`確定刪除供應商「${current.name}」？`)) {
              store.removeItem("suppliers", current.id);
              setDrawer(null);
            }
          }}
        />
      )}

      {(drawer?.mode === "create" || drawer?.mode === "edit") && (
        <SupplierFormDrawer
          initial={
            drawer.mode === "edit"
              ? current
              : { ...EMPTY_SUPPLIER, owner: currentUser }
          }
          mode={drawer.mode}
          onClose={() => setDrawer(null)}
          onSubmit={(data) => {
            if (drawer.mode === "edit") {
              store.updateItem("suppliers", current.id, data);
              setDrawer({ mode: "detail", id: current.id });
            } else {
              const created = store.addItem("suppliers", {
                ...data,
                created: today(),
              });
              setDrawer({ mode: "detail", id: created.id });
            }
          }}
        />
      )}
    </div>
  );
}

function StatBox({ label, value, color }) {
  return (
    <div
      style={{
        flex: 1,
        background: T.surfaceAlt,
        borderRadius: T.radiusSm,
        padding: "10px 12px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: 18,
          fontWeight: 800,
          color: color || T.text,
          fontFamily: T.mono,
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 10, color: T.textTertiary, marginTop: 3 }}>
        {label}
      </div>
    </div>
  );
}

function SupplierDetailDrawer({
  supplier,
  deals,
  customers,
  onOpenDeal,
  onClose,
  onEdit,
  onDelete,
}) {
  const stats = getSupplierStats(supplier, deals);

  // 階段分佈：進行中商機按產品線 → 階段
  const byProduct = PRODUCTS.map((p) => {
    const dealsInProduct = stats.active.filter((d) => d.product === p.id);
    return {
      ...p,
      deals: dealsInProduct,
      total: dealsInProduct.reduce((sum, d) => sum + d.amount, 0),
    };
  }).filter((p) => p.deals.length > 0);

  return (
    <Drawer
      open
      title={`供應商 · ${supplier.name}`}
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
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        <StatBox
          label="進行中"
          value={stats.activeAmount > 0 ? fmt(stats.activeAmount) : "—"}
          color="#2563EB"
        />
        <StatBox
          label="已成交"
          value={stats.wonAmount > 0 ? fmt(stats.wonAmount) : "—"}
          color="#059669"
        />
        <StatBox
          label="總商機"
          value={`${stats.deals.length}（成交 ${stats.won.length}）`}
          color={T.text}
        />
      </div>

      <DetailSection title="基本資料">
        <DetailRow label="供應商">{supplier.name}</DetailRow>
        <DetailRow label="類型">
          <span style={s.badge("#0EA5E9", "#E0F2FE")}>{supplier.type}</span>
        </DetailRow>
        <DetailRow label="狀態">
          {supplier.status === "啟用" ? (
            <span style={s.badge("#059669", "#D1FAE5")}>啟用</span>
          ) : (
            <span style={s.badge("#6B7280", "#F3F4F6")}>停用</span>
          )}
        </DetailRow>
        <DetailRow label="付款條件">{supplier.paymentTerms}</DetailRow>
      </DetailSection>

      <DetailSection title="聯絡">
        <DetailRow label="聯絡人">{supplier.contact}</DetailRow>
        <DetailRow label="電話">
          <span style={{ fontFamily: T.mono }}>{supplier.phone}</span>
        </DetailRow>
        <DetailRow label="Email">
          <span style={{ fontFamily: T.mono }}>{supplier.email}</span>
        </DetailRow>
      </DetailSection>

      {supplier.notes && (
        <DetailSection title="備註">
          <div style={{ fontSize: 13, color: T.text, whiteSpace: "pre-wrap" }}>
            {supplier.notes}
          </div>
        </DetailSection>
      )}

      <DetailSection title="負責對接">
        <DetailRow label="對接人">{getRep(supplier.owner)?.name}</DetailRow>
        <DetailRow label="創建時間">
          <span style={{ fontFamily: T.mono }}>{supplier.created}</span>
        </DetailRow>
      </DetailSection>

      {byProduct.length > 0 && (
        <DetailSection title="進行中商機（按產品線）">
          {byProduct.map((p) => (
            <div key={p.id} style={{ marginBottom: 12 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  marginBottom: 4,
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: p.color,
                    fontFamily: T.font,
                  }}
                >
                  {p.icon} {p.name}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    fontFamily: T.mono,
                    fontWeight: 700,
                    color: p.color,
                  }}
                >
                  {fmt(p.total)}
                </div>
              </div>
              {p.deals.map((d) => (
                <button
                  key={d.id}
                  onClick={() => onOpenDeal?.(d.id)}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "6px 10px",
                    border: `1px solid ${T.borderLight}`,
                    borderLeft: `3px solid ${p.color}`,
                    borderRadius: 5,
                    background: T.surface,
                    marginBottom: 4,
                    cursor: "pointer",
                    fontFamily: T.font,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>
                      {d.title}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        fontFamily: T.mono,
                        fontWeight: 600,
                        color: p.color,
                      }}
                    >
                      {fmt(d.amount)}
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: T.textTertiary }}>
                    {getCustomer(d.customerId, customers)?.name} ·{" "}
                    <span style={s.badge(p.color, `${p.color}14`)}>{d.stage}</span>
                  </div>
                </button>
              ))}
            </div>
          ))}
        </DetailSection>
      )}

      {stats.won.length > 0 && (
        <DetailSection title={`已成交商機（${stats.won.length}）`}>
          {stats.won.map((d) => {
            const p = getProduct(d.product);
            return (
              <button
                key={d.id}
                onClick={() => onOpenDeal?.(d.id)}
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
                    alignItems: "baseline",
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>
                    {d.title}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#059669",
                      fontFamily: T.mono,
                    }}
                  >
                    {fmt(d.amount)}
                  </div>
                </div>
                <div style={{ fontSize: 11, color: T.textTertiary }}>
                  {getCustomer(d.customerId, customers)?.name}
                  {p && (
                    <>
                      {" "}
                      · <span style={s.badge(p.color, `${p.color}14`)}>{p.icon} {p.name}</span>
                    </>
                  )}
                  <span style={{ marginLeft: 6 }}>
                    <StatusBadge status={d.status} />
                  </span>
                </div>
              </button>
            );
          })}
        </DetailSection>
      )}
    </Drawer>
  );
}

function SupplierFormDrawer({ initial, mode, onClose, onSubmit }) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.name?.trim()) e.name = "請輸入供應商名稱";
    if (form.email && !/.+@.+\..+/.test(form.email)) e.email = "Email 格式不正確";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  return (
    <Drawer
      open
      title={mode === "edit" ? "編輯供應商" : "新增供應商"}
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} style={s.btn(false)}>
            取消
          </button>
          <button
            onClick={() => {
              if (validate()) onSubmit(form);
            }}
            style={s.btn(true)}
          >
            {mode === "edit" ? "儲存" : "建立"}
          </button>
        </>
      }
    >
      <Field label="供應商名稱" required error={errors.name}>
        <TextInput
          value={form.name}
          onChange={(v) => set("name", v)}
          placeholder="例如：華科技術"
        />
      </Field>
      <Field label="類型">
        <SelectInput
          value={form.type}
          onChange={(v) => set("type", v)}
          options={SUPPLIER_TYPES}
        />
      </Field>
      <Field label="聯絡人">
        <TextInput value={form.contact} onChange={(v) => set("contact", v)} />
      </Field>
      <Field label="電話">
        <TextInput value={form.phone} onChange={(v) => set("phone", v)} />
      </Field>
      <Field label="Email" error={errors.email}>
        <TextInput
          type="email"
          value={form.email}
          onChange={(v) => set("email", v)}
        />
      </Field>
      <Field label="付款條件" hint="例如：30 天結款 / 預付 50% / 月結">
        <TextInput
          value={form.paymentTerms}
          onChange={(v) => set("paymentTerms", v)}
        />
      </Field>
      <Field label="狀態">
        <SelectInput
          value={form.status}
          onChange={(v) => set("status", v)}
          options={SUPPLIER_STATUSES}
        />
      </Field>
      <Field label="備註">
        <TextArea
          value={form.notes}
          onChange={(v) => set("notes", v)}
          rows={3}
        />
      </Field>
      <Field label="對接人">
        <SelectInput
          value={form.owner}
          onChange={(v) => set("owner", v)}
          options={REPS.map((r) => ({ value: r.id, label: r.name }))}
        />
      </Field>
    </Drawer>
  );
}
