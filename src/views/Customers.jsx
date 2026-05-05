import { useMemo, useState } from "react";
import {
  CUSTOMER_STATUSES,
  INDUSTRIES,
  LEAD_SOURCES,
  PRODUCTS,
  REPS,
} from "../constants.js";
import { ContactFormDrawer } from "./Contacts.jsx";
import { DealFormDrawer } from "./Deals.jsx";
import { fmt, getRep } from "../utils.js";
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
  SelectInput,
  TextInput,
} from "../components/fields.jsx";

const EMPTY_CUSTOMER = {
  name: "",
  corpGroup: null,
  industry: "其他",
  address: "",
  status: "初訪",
  source: "官網",
  owner: null,
  collaborators: [],
};

export function CustomersView({
  store,
  drawerSeed,
  onConsumeSeed,
  onOpenContact,
  onOpenDeal,
  onOpenChannel,
}) {
  const { customers, contacts, deals, contracts, quotes, channels, suppliers, currentUser } = store;
  const [tab, setTab] = useState("all");
  const [fIndustry, setFIndustry] = useState("all");
  const [fStatus, setFStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [drawer, setDrawer] = useState(null);
  const [subDrawer, setSubDrawer] = useState(null); // { type: "contact"|"deal", customer }

  if (drawerSeed && !drawer) {
    setDrawer(drawerSeed);
    onConsumeSeed?.();
  }

  const filtered = useMemo(() => {
    let d = customers;
    if (tab === "mine") d = d.filter((x) => x.owner === currentUser);
    if (tab === "collab") d = d.filter((x) => x.collaborators.includes(currentUser));
    if (fIndustry !== "all") d = d.filter((x) => x.industry === fIndustry);
    if (fStatus !== "all") d = d.filter((x) => x.status === fStatus);
    if (search)
      d = d.filter(
        (x) => x.name.includes(search) || (x.corpGroup || "").includes(search)
      );
    return d;
  }, [customers, tab, fIndustry, fStatus, search]);

  const current = drawer?.id ? customers.find((c) => c.id === drawer.id) : null;

  const columns = [
    {
      key: "name",
      label: "商戶名稱",
      render: (r) => <span style={s.link}>{r.name}</span>,
    },
    { key: "industry", label: "所屬行業" },
    {
      key: "corpGroup",
      label: "集團",
      render: (r) =>
        r.corpGroup ? (
          <span style={s.badge("#7C3AED", "#EDE9FE")}>{r.corpGroup}</span>
        ) : (
          <span style={{ color: T.textTertiary }}>—</span>
        ),
    },
    {
      key: "status",
      label: "跟進狀態",
      render: (r) => <StatusBadge status={r.status} />,
    },
    { key: "source", label: "客戶來源" },
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
        title="客戶"
        count={filtered.length}
        addLabel="新增客戶"
        onAdd={() => setDrawer({ mode: "create" })}
      />
      <OwnerTabs active={tab} onChange={setTab} />
      <FilterRow>
        <select style={s.select} value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
          <option value="all">跟進狀態：全部</option>
          {CUSTOMER_STATUSES.map((x) => (
            <option key={x} value={x}>
              {x}
            </option>
          ))}
        </select>
        <select
          style={s.select}
          value={fIndustry}
          onChange={(e) => setFIndustry(e.target.value)}
        >
          <option value="all">所屬行業：全部</option>
          {INDUSTRIES.map((x) => (
            <option key={x} value={x}>
              {x}
            </option>
          ))}
        </select>
        <div style={{ marginLeft: "auto" }}>
          <input
            style={{ ...s.input, width: 200, padding: "6px 10px", fontSize: 12 }}
            placeholder="搜尋商戶名稱/集團"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </FilterRow>
      <DataTable
        columns={columns}
        data={filtered}
        emptyText="找不到符合條件的客戶"
        onRowClick={(r) => setDrawer({ mode: "detail", id: r.id })}
      />

      {drawer?.mode === "detail" && current && (
        <CustomerDetailDrawer
          customer={current}
          channels={channels}
          contacts={contacts.filter((c) => c.customerId === current.id)}
          deals={deals.filter((d) => d.customerId === current.id)}
          contracts={contracts.filter((k) => k.customerId === current.id)}
          quotes={quotes.filter((q) => q.customerId === current.id)}
          onOpenContact={onOpenContact}
          onOpenDeal={onOpenDeal}
          onOpenChannel={onOpenChannel}
          onCreateContact={() => setSubDrawer({ type: "contact", customer: current })}
          onCreateDeal={() => setSubDrawer({ type: "deal", customer: current })}
          onClose={() => setDrawer(null)}
          onEdit={() => setDrawer({ mode: "edit", id: current.id })}
          onDelete={async () => {
            if (!confirm(`確定刪除客戶「${current.name}」？`)) return;
            try {
              await store.removeItem("customers", current.id);
              setDrawer(null);
            } catch (err) {
              alert(err.message || "刪除失敗");
            }
          }}
        />
      )}

      {(drawer?.mode === "create" || drawer?.mode === "edit") && (
        <CustomerFormDrawer
          initial={drawer.mode === "edit" ? current : { ...EMPTY_CUSTOMER, owner: currentUser }}
          mode={drawer.mode}
          onClose={() => setDrawer(null)}
          onSubmit={async (data) => {
            try {
              if (drawer.mode === "edit") {
                await store.updateItem("customers", current.id, data);
                setDrawer({ mode: "detail", id: current.id });
              } else {
                const created = await store.addItem("customers", data);
                setDrawer({ mode: "detail", id: created.id });
              }
            } catch (err) {
              alert(err.message || "儲存失敗");
            }
          }}
        />
      )}

      {subDrawer?.type === "contact" && (
        <ContactFormDrawer
          mode="create"
          customers={customers}
          initial={{
            customerId: subDrawer.customer.id,
            name: "",
            role: "",
            phone: "",
            email: "",
            owner: subDrawer.customer.owner || currentUser,
            collaborators: [],
          }}
          onClose={() => setSubDrawer(null)}
          onSubmit={async (data) => {
            try {
              await store.addItem("contacts", data);
              setSubDrawer(null);
            } catch (err) {
              alert(err.message || "儲存失敗");
            }
          }}
        />
      )}

      {subDrawer?.type === "deal" && (
        <DealFormDrawer
          mode="create"
          customers={customers}
          suppliers={suppliers}
          initial={{
            title: "",
            customerId: subDrawer.customer.id,
            product: PRODUCTS[0].id,
            stage: PRODUCTS[0].stages[0],
            amount: 0,
            status: "進行中",
            supplierId: null,
            owner: subDrawer.customer.owner || currentUser,
            collaborators: [],
          }}
          onClose={() => setSubDrawer(null)}
          onSubmit={async (data) => {
            try {
              await store.addItem("deals", data);
              setSubDrawer(null);
            } catch (err) {
              alert(err.message || "儲存失敗");
            }
          }}
        />
      )}
    </div>
  );
}

function CustomerDetailDrawer({
  customer,
  channels,
  contacts,
  deals,
  contracts,
  quotes,
  onOpenContact,
  onOpenDeal,
  onOpenChannel,
  onCreateContact,
  onCreateDeal,
  onClose,
  onEdit,
  onDelete,
}) {
  const channel = customer.channelId
    ? channels?.find((c) => c.id === customer.channelId)
    : null;
  return (
    <Drawer
      open
      title={`客戶 · ${customer.name}`}
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
        <DetailRow label="商戶名稱">{customer.name}</DetailRow>
        <DetailRow label="集團">
          {customer.corpGroup ? (
            <span style={s.badge("#7C3AED", "#EDE9FE")}>{customer.corpGroup}</span>
          ) : null}
        </DetailRow>
        <DetailRow label="所屬行業">{customer.industry}</DetailRow>
        <DetailRow label="地址">{customer.address}</DetailRow>
        <DetailRow label="跟進狀態">
          <StatusBadge status={customer.status} />
        </DetailRow>
        <DetailRow label="客戶來源">{customer.source}</DetailRow>
        {channel && (
          <DetailRow label="渠道方">
            <button
              onClick={() => onOpenChannel?.(channel.id)}
              style={{ ...s.link, background: "none", border: "none", padding: 0 }}
            >
              {channel.name}
            </button>
            <span style={{ marginLeft: 6, color: T.textTertiary, fontSize: 11 }}>
              · {channel.type} · 佣金 {channel.commissionRate}%
            </span>
          </DetailRow>
        )}
      </DetailSection>

      <DetailSection title="負責人">
        <DetailRow label="負責人">{getRep(customer.owner)?.name}</DetailRow>
        <DetailRow label="協作人">
          {customer.collaborators.length
            ? customer.collaborators.map((id) => getRep(id)?.name).join("、")
            : null}
        </DetailRow>
        <DetailRow label="創建時間">
          <span style={{ fontFamily: T.mono }}>{customer.created}</span>
        </DetailRow>
      </DetailSection>

      <DetailSection
        title={`聯系人（${contacts.length}）`}
        action={
          onCreateContact && (
            <button
              type="button"
              onClick={onCreateContact}
              style={{
                background: "none",
                border: "none",
                color: T.accent,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                padding: 0,
                fontFamily: T.font,
              }}
            >
              ＋ 新增
            </button>
          )
        }
      >
        {contacts.length === 0 ? (
          <div style={{ fontSize: 12, color: T.textTertiary }}>暫無</div>
        ) : (
          contacts.map((c) => (
            <button
              key={c.id}
              onClick={() => onOpenContact?.(c.id)}
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
              <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{c.name}</div>
              <div style={{ fontSize: 11, color: T.textTertiary }}>
                {c.role} · {c.email}
              </div>
            </button>
          ))
        )}
      </DetailSection>

      <DetailSection
        title={`商機（${deals.length}）`}
        action={
          onCreateDeal && (
            <button
              type="button"
              onClick={onCreateDeal}
              style={{
                background: "none",
                border: "none",
                color: T.accent,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                padding: 0,
                fontFamily: T.font,
              }}
            >
              ＋ 新增
            </button>
          )
        }
      >
        {deals.length === 0 ? (
          <div style={{ fontSize: 12, color: T.textTertiary }}>暫無</div>
        ) : (
          deals.map((d) => (
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
              <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{d.title}</div>
              <div style={{ fontSize: 11, color: T.textTertiary, fontFamily: T.mono }}>
                {fmt(d.amount)} · {d.stage}
              </div>
            </button>
          ))
        )}
      </DetailSection>

      <DetailSection title={`合同（${contracts.length}）`}>
        {contracts.length === 0 ? (
          <div style={{ fontSize: 12, color: T.textTertiary }}>暫無</div>
        ) : (
          contracts.map((k) => (
            <div
              key={k.id}
              style={{
                padding: "8px 10px",
                border: `1px solid ${T.borderLight}`,
                borderRadius: 5,
                marginBottom: 6,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{k.title}</div>
              <div style={{ fontSize: 11, color: T.textTertiary, fontFamily: T.mono }}>
                {fmt(k.amount)} · {k.status}
              </div>
            </div>
          ))
        )}
      </DetailSection>

      <DetailSection title={`報價單（${quotes.length}）`}>
        {quotes.length === 0 ? (
          <div style={{ fontSize: 12, color: T.textTertiary }}>暫無</div>
        ) : (
          quotes.map((q) => (
            <div
              key={q.id}
              style={{
                padding: "8px 10px",
                border: `1px solid ${T.borderLight}`,
                borderRadius: 5,
                marginBottom: 6,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{q.title}</div>
              <div style={{ fontSize: 11, color: T.textTertiary, fontFamily: T.mono }}>
                {fmt(q.amount)} · {q.status}
              </div>
            </div>
          ))
        )}
      </DetailSection>
    </Drawer>
  );
}

function CustomerFormDrawer({ initial, mode, onClose, onSubmit }) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.name?.trim()) e.name = "請輸入商戶名稱";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  return (
    <Drawer
      open
      title={mode === "edit" ? "編輯客戶" : "新增客戶"}
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
      <Field label="商戶名稱" required error={errors.name}>
        <TextInput value={form.name} onChange={(v) => set("name", v)} />
      </Field>
      <Field label="集團（可選）">
        <TextInput
          value={form.corpGroup || ""}
          onChange={(v) => set("corpGroup", v || null)}
          placeholder="如：鴻海集團"
        />
      </Field>
      <Field label="所屬行業">
        <SelectInput
          value={form.industry}
          onChange={(v) => set("industry", v)}
          options={INDUSTRIES}
        />
      </Field>
      <Field label="地址">
        <TextInput value={form.address} onChange={(v) => set("address", v)} />
      </Field>
      <Field label="跟進狀態">
        <SelectInput
          value={form.status}
          onChange={(v) => set("status", v)}
          options={CUSTOMER_STATUSES}
        />
      </Field>
      <Field label="客戶來源">
        <SelectInput
          value={form.source}
          onChange={(v) => set("source", v)}
          options={LEAD_SOURCES}
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
