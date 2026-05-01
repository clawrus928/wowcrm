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
  NumberInput,
  SelectInput,
  TextInput,
} from "../components/fields.jsx";

const EMPTY_QUOTE = {
  title: "",
  customerId: null,
  dealId: null,
  amount: 0,
  status: "草稿",
  validUntil: null,
  owner: null,
  collaborators: [],
};

export function QuotesView({ store }) {
  const { quotes, customers, deals, currentUser } = store;
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
      render: (r) => <span style={{ fontWeight: 600, color: T.text }}>{fmt(r.amount)}</span>,
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
          quote={current}
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
          initial={drawer.mode === "edit" ? current : { ...EMPTY_QUOTE, owner: currentUser }}
          mode={drawer.mode}
          customers={customers}
          deals={deals}
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
        <DetailRow label="金額">
          <span style={{ fontFamily: T.mono, fontWeight: 700 }}>{fmt(quote.amount)}</span>
        </DetailRow>
        <DetailRow label="狀態">
          <StatusBadge status={quote.status} />
        </DetailRow>
        <DetailRow label="有效期限">
          <span style={{ fontFamily: T.mono }}>{quote.validUntil}</span>
        </DetailRow>
      </DetailSection>
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

function QuoteFormDrawer({ initial, mode, customers, deals, onClose, onSubmit }) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const dealOptions = form.customerId
    ? deals.filter((d) => d.customerId === form.customerId)
    : deals;

  const validate = () => {
    const e = {};
    if (!form.title?.trim()) e.title = "請輸入報價單名稱";
    if (!form.customerId) e.customerId = "請選擇客戶";
    if (form.amount == null || form.amount < 0) e.amount = "請輸入有效金額";
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
      <Field label="報價單名稱" required error={errors.title}>
        <TextInput value={form.title} onChange={(v) => set("title", v)} />
      </Field>
      <Field label="關聯客戶" required error={errors.customerId}>
        <SelectInput
          value={form.customerId}
          onChange={(v) => setForm((f) => ({ ...f, customerId: v, dealId: null }))}
          placeholder="請選擇"
          options={customers.map((c) => ({ value: c.id, label: c.name }))}
        />
      </Field>
      <Field label="關聯商機">
        <SelectInput
          value={form.dealId}
          onChange={(v) => set("dealId", v)}
          placeholder="（可選）"
          options={dealOptions.map((d) => ({ value: d.id, label: d.title }))}
        />
      </Field>
      <Field label="金額（MOP）" required error={errors.amount}>
        <NumberInput value={form.amount} onChange={(v) => set("amount", v)} />
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
