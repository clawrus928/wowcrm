import { useMemo, useState } from "react";
import {
  PRICING_BILLING,
  PRICING_CATEGORIES,
  PRICING_STATUSES,
  REPS,
} from "../constants.js";
import { fmt, getRep } from "../utils.js";
import { s } from "../styles.js";
import { T } from "../theme.js";
import { DataTable, FilterRow, PageHeader } from "../components/DataTable.jsx";
import { Drawer } from "../components/Drawer.jsx";
import { DetailRow, DetailSection } from "../components/DetailRow.jsx";
import {
  Field,
  NumberInput,
  SelectInput,
  TextArea,
  TextInput,
} from "../components/fields.jsx";

const EMPTY_PRICING = {
  name: "",
  category: "顧問服務",
  price: 0,
  cost: 0,
  billingType: "一次性",
  description: "",
  status: "啟用",
  owner: null,
};

function categoryColor(cat) {
  switch (cat) {
    case "顧問服務": return ["#2563EB", "#DBEAFE"];
    case "硬體設備": return ["#059669", "#D1FAE5"];
    case "行銷服務": return ["#D97706", "#FEF3C7"];
    default: return ["#6B7280", "#F3F4F6"];
  }
}

export function PricingsView({ store, drawerSeed, onConsumeSeed }) {
  const { pricings, currentUser } = store;
  const [fStatus, setFStatus] = useState("all");
  const [fCategory, setFCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [drawer, setDrawer] = useState(null);

  if (drawerSeed && !drawer) {
    setDrawer(drawerSeed);
    onConsumeSeed?.();
  }

  const filtered = useMemo(() => {
    let d = pricings;
    if (fStatus !== "all") d = d.filter((x) => x.status === fStatus);
    if (fCategory !== "all") d = d.filter((x) => x.category === fCategory);
    if (search) d = d.filter((x) => x.name.includes(search));
    return d;
  }, [pricings, fStatus, fCategory, search]);

  const current = drawer?.id ? pricings.find((p) => p.id === drawer.id) : null;

  const columns = [
    {
      key: "name",
      label: "項目名稱",
      render: (r) => <span style={s.link}>{r.name}</span>,
    },
    {
      key: "category",
      label: "分類",
      render: (r) => {
        const [c, bg] = categoryColor(r.category);
        return <span style={s.badge(c, bg)}>{r.category}</span>;
      },
    },
    {
      key: "billingType",
      label: "計費",
    },
    {
      key: "price",
      label: "預設售價",
      mono: true,
      render: (r) => <span style={{ fontWeight: 600 }}>{fmt(r.price || 0)}</span>,
    },
    {
      key: "cost",
      label: "成本",
      mono: true,
      render: (r) => (
        <span style={{ color: T.textSecondary }}>{fmt(r.cost || 0)}</span>
      ),
    },
    {
      key: "margin",
      label: "毛利",
      mono: true,
      render: (r) => {
        const m = (r.price || 0) - (r.cost || 0);
        const pct = r.price ? Math.round((m / r.price) * 100) : 0;
        return (
          <span style={{ color: m > 0 ? "#059669" : "#DC2626", fontWeight: 600 }}>
            {fmt(m)} <span style={{ fontSize: 10, opacity: 0.7 }}>({pct}%)</span>
          </span>
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
      label: "建立者",
      render: (r) => getRep(r.owner)?.name || "—",
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <PageHeader
        title="收費項目"
        count={filtered.length}
        addLabel="新增項目"
        onAdd={() => setDrawer({ mode: "create" })}
      />
      <FilterRow>
        <select
          style={s.select}
          value={fCategory}
          onChange={(e) => setFCategory(e.target.value)}
        >
          <option value="all">分類：全部</option>
          {PRICING_CATEGORIES.map((x) => (
            <option key={x} value={x}>
              {x}
            </option>
          ))}
        </select>
        <select
          style={s.select}
          value={fStatus}
          onChange={(e) => setFStatus(e.target.value)}
        >
          <option value="all">狀態：全部</option>
          {PRICING_STATUSES.map((x) => (
            <option key={x} value={x}>
              {x}
            </option>
          ))}
        </select>
        <div style={{ marginLeft: "auto" }}>
          <input
            style={{ ...s.input, width: 200, padding: "6px 10px", fontSize: 12 }}
            placeholder="搜尋項目名稱"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </FilterRow>
      <DataTable
        columns={columns}
        data={filtered}
        emptyText="找不到符合條件的項目"
        onRowClick={(r) => setDrawer({ mode: "detail", id: r.id })}
      />

      {drawer?.mode === "detail" && current && (
        <PricingDetailDrawer
          pricing={current}
          onClose={() => setDrawer(null)}
          onEdit={() => setDrawer({ mode: "edit", id: current.id })}
          onDelete={async () => {
            if (!confirm(`確定刪除收費項目「${current.name}」？`)) return;
            try {
              await store.removeItem("pricings", current.id);
              setDrawer(null);
            } catch (err) {
              alert(err.message || "刪除失敗");
            }
          }}
        />
      )}

      {(drawer?.mode === "create" || drawer?.mode === "edit") && (
        <PricingFormDrawer
          initial={
            drawer.mode === "edit"
              ? current
              : { ...EMPTY_PRICING, owner: currentUser }
          }
          mode={drawer.mode}
          onClose={() => setDrawer(null)}
          onSubmit={async (data) => {
            try {
              if (drawer.mode === "edit") {
                await store.updateItem("pricings", current.id, data);
                setDrawer({ mode: "detail", id: current.id });
              } else {
                const created = await store.addItem("pricings", data);
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

function PricingDetailDrawer({ pricing, onClose, onEdit, onDelete }) {
  const margin = (pricing.price || 0) - (pricing.cost || 0);
  const pct = pricing.price ? Math.round((margin / pricing.price) * 100) : 0;
  const [c, bg] = categoryColor(pricing.category);
  return (
    <Drawer
      open
      title={`收費項目 · ${pricing.name}`}
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
        <DetailRow label="項目名稱">{pricing.name}</DetailRow>
        <DetailRow label="分類">
          <span style={s.badge(c, bg)}>{pricing.category}</span>
        </DetailRow>
        <DetailRow label="計費方式">{pricing.billingType}</DetailRow>
        <DetailRow label="狀態">
          {pricing.status === "啟用" ? (
            <span style={s.badge("#059669", "#D1FAE5")}>啟用</span>
          ) : (
            <span style={s.badge("#6B7280", "#F3F4F6")}>停用</span>
          )}
        </DetailRow>
      </DetailSection>

      <DetailSection title="售價 / 成本">
        <DetailRow label="預設售價">
          <span style={{ fontFamily: T.mono, fontWeight: 700 }}>
            {fmt(pricing.price || 0)}
          </span>
        </DetailRow>
        <DetailRow label="成本">
          <span style={{ fontFamily: T.mono, color: T.textSecondary }}>
            {fmt(pricing.cost || 0)}
          </span>
        </DetailRow>
        <DetailRow label="毛利">
          <span
            style={{
              fontFamily: T.mono,
              fontWeight: 700,
              color: margin > 0 ? "#059669" : "#DC2626",
            }}
          >
            {fmt(margin)} ({pct}%)
          </span>
        </DetailRow>
      </DetailSection>

      {pricing.description && (
        <DetailSection title="說明">
          <div
            style={{ fontSize: 13, color: T.text, whiteSpace: "pre-wrap" }}
          >
            {pricing.description}
          </div>
        </DetailSection>
      )}

      <DetailSection title="紀錄">
        <DetailRow label="建立者">{getRep(pricing.owner)?.name}</DetailRow>
        <DetailRow label="創建時間">
          <span style={{ fontFamily: T.mono }}>{pricing.created}</span>
        </DetailRow>
      </DetailSection>
    </Drawer>
  );
}

function PricingFormDrawer({ initial, mode, onClose, onSubmit }) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.name?.trim()) e.name = "請輸入項目名稱";
    if (form.price == null || form.price < 0) e.price = "請輸入有效售價";
    if (form.cost != null && form.cost < 0) e.cost = "成本不可為負數";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const margin = (form.price || 0) - (form.cost || 0);
  const pct = form.price ? Math.round((margin / form.price) * 100) : 0;

  return (
    <Drawer
      open
      title={mode === "edit" ? "編輯收費項目" : "新增收費項目"}
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
      <Field label="項目名稱" required error={errors.name}>
        <TextInput
          value={form.name}
          onChange={(v) => set("name", v)}
          placeholder="例：智慧工廠顧問 - 基礎版"
        />
      </Field>
      <Field label="分類">
        <SelectInput
          value={form.category}
          onChange={(v) => set("category", v)}
          options={PRICING_CATEGORIES}
        />
      </Field>
      <Field label="計費方式">
        <SelectInput
          value={form.billingType}
          onChange={(v) => set("billingType", v)}
          options={PRICING_BILLING}
        />
      </Field>
      <Field label="預設售價（MOP）" required error={errors.price}>
        <NumberInput value={form.price} onChange={(v) => set("price", v)} />
      </Field>
      <Field label="成本（MOP）" hint="內部欄位，不會列印給客戶" error={errors.cost}>
        <NumberInput value={form.cost} onChange={(v) => set("cost", v)} />
      </Field>
      <div
        style={{
          margin: "0 0 14px",
          padding: "8px 12px",
          background: T.surfaceAlt,
          borderRadius: T.radiusSm,
          fontSize: 12,
          fontFamily: T.font,
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <span style={{ color: T.textSecondary }}>毛利</span>
        <span
          style={{
            fontFamily: T.mono,
            fontWeight: 700,
            color: margin > 0 ? "#059669" : "#DC2626",
          }}
        >
          {fmt(margin)} ({pct}%)
        </span>
      </div>
      <Field label="說明">
        <TextArea
          value={form.description}
          onChange={(v) => set("description", v)}
          rows={3}
        />
      </Field>
      <Field label="狀態">
        <SelectInput
          value={form.status}
          onChange={(v) => set("status", v)}
          options={PRICING_STATUSES}
        />
      </Field>
      <Field label="建立者">
        <SelectInput
          value={form.owner}
          onChange={(v) => set("owner", v)}
          options={REPS.map((r) => ({ value: r.id, label: r.name }))}
        />
      </Field>
    </Drawer>
  );
}
