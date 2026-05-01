import { useMemo, useState } from "react";
import {
  CHANNEL_STATUSES,
  CHANNEL_TYPES,
  REPS,
} from "../constants.js";
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
  SelectInput,
  TextArea,
  TextInput,
} from "../components/fields.jsx";

const EMPTY_CHANNEL = {
  name: "",
  type: "二級代理",
  contact: "",
  phone: "",
  email: "",
  status: "啟用",
  notes: "",
  owner: null,
};

function getChannelStats(channel, leads, customers, deals, contracts) {
  const channelLeads = leads.filter((l) => l.channelId === channel.id);
  const channelCustomerIds = new Set(
    customers.filter((c) => c.channelId === channel.id).map((c) => c.id)
  );
  const convertedFromLeads = channelLeads
    .filter((l) => l.convertedCustomerId)
    .map((l) => l.convertedCustomerId);
  for (const id of convertedFromLeads) channelCustomerIds.add(id);

  const channelCustomers = customers.filter((c) => channelCustomerIds.has(c.id));
  const channelDeals = deals.filter((d) => channelCustomerIds.has(d.customerId));
  const wonDeals = channelDeals.filter((d) => d.status === "已成交");
  const wonAmount = wonDeals.reduce((sum, d) => sum + d.amount, 0);
  const activeAmount = channelDeals
    .filter((d) => d.status === "進行中")
    .reduce((sum, d) => sum + d.amount, 0);

  const channelContracts = (contracts || []).filter((k) =>
    channelCustomerIds.has(k.customerId)
  );
  const commission = channelContracts.reduce(
    (sum, k) => sum + (Number(k.internalCommissionAmount) || 0),
    0
  );

  return {
    leadCount: channelLeads.length,
    customerCount: channelCustomers.length,
    dealCount: channelDeals.length,
    wonAmount,
    activeAmount,
    commission,
    leads: channelLeads,
    customers: channelCustomers,
  };
}

export function ChannelsView({ store, drawerSeed, onConsumeSeed, onOpenLead, onOpenCustomer }) {
  const { channels, leads, customers, deals, contracts, currentUser } = store;
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
    let d = channels;
    if (tab === "mine") d = d.filter((x) => x.owner === currentUser);
    if (fStatus !== "all") d = d.filter((x) => x.status === fStatus);
    if (fType !== "all") d = d.filter((x) => x.type === fType);
    if (search)
      d = d.filter(
        (x) =>
          x.name.includes(search) ||
          (x.contact || "").includes(search)
      );
    return d;
  }, [channels, tab, fStatus, fType, search]);

  const current = drawer?.id ? channels.find((c) => c.id === drawer.id) : null;

  const columns = [
    {
      key: "name",
      label: "渠道名稱",
      render: (r) => <span style={s.link}>{r.name}</span>,
    },
    {
      key: "type",
      label: "類型",
      render: (r) => (
        <span style={s.badge("#7C3AED", "#EDE9FE")}>{r.type}</span>
      ),
    },
    { key: "contact", label: "聯絡人" },
    { key: "phone", label: "電話", mono: true },
    {
      key: "leads",
      label: "帶入線索",
      mono: true,
      render: (r) =>
        leads.filter((l) => l.channelId === r.id).length || "—",
    },
    {
      key: "wonAmount",
      label: "成交金額",
      mono: true,
      render: (r) => {
        const stats = getChannelStats(r, leads, customers, deals, contracts);
        return stats.wonAmount > 0 ? (
          <span style={{ fontWeight: 600, color: "#059669" }}>
            {fmt(stats.wonAmount)}
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
        title="渠道方"
        count={filtered.length}
        addLabel="新增渠道"
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
          {CHANNEL_STATUSES.map((x) => (
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
          {CHANNEL_TYPES.map((x) => (
            <option key={x} value={x}>
              {x}
            </option>
          ))}
        </select>
        <div style={{ marginLeft: "auto" }}>
          <input
            style={{ ...s.input, width: 200, padding: "6px 10px", fontSize: 12 }}
            placeholder="搜尋渠道/聯絡人"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </FilterRow>
      <DataTable
        columns={columns}
        data={filtered}
        emptyText="找不到符合條件的渠道方"
        onRowClick={(r) => setDrawer({ mode: "detail", id: r.id })}
      />

      {drawer?.mode === "detail" && current && (
        <ChannelDetailDrawer
          channel={current}
          leads={leads}
          customers={customers}
          deals={deals}
          contracts={contracts}
          onOpenLead={onOpenLead}
          onOpenCustomer={onOpenCustomer}
          onClose={() => setDrawer(null)}
          onEdit={() => setDrawer({ mode: "edit", id: current.id })}
          onDelete={async () => {
            if (!confirm(`確定刪除渠道「${current.name}」？`)) return;
            try {
              await store.removeItem("channels", current.id);
              setDrawer(null);
            } catch (err) {
              alert(err.message || "刪除失敗");
            }
          }}
        />
      )}

      {(drawer?.mode === "create" || drawer?.mode === "edit") && (
        <ChannelFormDrawer
          initial={drawer.mode === "edit" ? current : { ...EMPTY_CHANNEL, owner: currentUser }}
          mode={drawer.mode}
          onClose={() => setDrawer(null)}
          onSubmit={async (data) => {
            try {
              if (drawer.mode === "edit") {
                await store.updateItem("channels", current.id, data);
                setDrawer({ mode: "detail", id: current.id });
              } else {
                const created = await store.addItem("channels", data);
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

function ChannelDetailDrawer({
  channel,
  leads,
  customers,
  deals,
  contracts,
  onOpenLead,
  onOpenCustomer,
  onClose,
  onEdit,
  onDelete,
}) {
  const stats = getChannelStats(channel, leads, customers, deals, contracts);
  const conversionRate =
    stats.leadCount > 0
      ? Math.round((stats.customerCount / stats.leadCount) * 100)
      : 0;

  return (
    <Drawer
      open
      title={`渠道方 · ${channel.name}`}
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
      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
        <StatBox label="帶入線索" value={stats.leadCount} color="#2563EB" />
        <StatBox
          label="轉化客戶"
          value={`${stats.customerCount} (${conversionRate}%)`}
          color="#059669"
        />
        <StatBox
          label="成交金額"
          value={stats.wonAmount > 0 ? fmt(stats.wonAmount) : "—"}
          color="#7C3AED"
        />
      </div>
      <div
        style={{
          padding: "8px 12px",
          background: T.accentBg,
          color: T.accentText,
          borderRadius: T.radiusSm,
          fontSize: 12,
          marginBottom: 4,
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <span>內部佣金（依合同）</span>
        <span style={{ fontFamily: T.mono, fontWeight: 700 }}>
          {fmt(stats.commission)}
        </span>
      </div>

      <DetailSection title="基本資料">
        <DetailRow label="渠道名稱">{channel.name}</DetailRow>
        <DetailRow label="類型">
          <span style={s.badge("#7C3AED", "#EDE9FE")}>{channel.type}</span>
        </DetailRow>
        <DetailRow label="狀態">
          {channel.status === "啟用" ? (
            <span style={s.badge("#059669", "#D1FAE5")}>啟用</span>
          ) : (
            <span style={s.badge("#6B7280", "#F3F4F6")}>停用</span>
          )}
        </DetailRow>
      </DetailSection>

      <DetailSection title="聯絡">
        <DetailRow label="聯絡人">{channel.contact}</DetailRow>
        <DetailRow label="電話">
          <span style={{ fontFamily: T.mono }}>{channel.phone}</span>
        </DetailRow>
        <DetailRow label="Email">
          <span style={{ fontFamily: T.mono }}>{channel.email}</span>
        </DetailRow>
      </DetailSection>

      {channel.notes && (
        <DetailSection title="備註">
          <div style={{ fontSize: 13, color: T.text, whiteSpace: "pre-wrap" }}>
            {channel.notes}
          </div>
        </DetailSection>
      )}

      <DetailSection title="負責對接">
        <DetailRow label="對接人">{getRep(channel.owner)?.name}</DetailRow>
        <DetailRow label="創建時間">
          <span style={{ fontFamily: T.mono }}>{channel.created}</span>
        </DetailRow>
      </DetailSection>

      <DetailSection title={`帶入線索（${stats.leads.length}）`}>
        {stats.leads.length === 0 ? (
          <div style={{ fontSize: 12, color: T.textTertiary }}>暫無</div>
        ) : (
          stats.leads.map((l) => (
            <button
              key={l.id}
              onClick={() => onOpenLead?.(l.id)}
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
                  {l.name} · {l.company}
                </div>
                <StatusBadge status={l.status} />
              </div>
            </button>
          ))
        )}
      </DetailSection>

      <DetailSection title={`轉化客戶（${stats.customers.length}）`}>
        {stats.customers.length === 0 ? (
          <div style={{ fontSize: 12, color: T.textTertiary }}>暫無</div>
        ) : (
          stats.customers.map((c) => (
            <button
              key={c.id}
              onClick={() => onOpenCustomer?.(c.id)}
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
              <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>
                {c.name}
              </div>
              <div style={{ fontSize: 11, color: T.textTertiary }}>
                {c.industry} · {c.address}
              </div>
            </button>
          ))
        )}
      </DetailSection>
    </Drawer>
  );
}

function ChannelFormDrawer({ initial, mode, onClose, onSubmit }) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.name?.trim()) e.name = "請輸入渠道名稱";
    if (form.email && !/.+@.+\..+/.test(form.email)) e.email = "Email 格式不正確";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  return (
    <Drawer
      open
      title={mode === "edit" ? "編輯渠道" : "新增渠道"}
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
      <Field label="渠道名稱" required error={errors.name}>
        <TextInput value={form.name} onChange={(v) => set("name", v)} placeholder="例如：明日商業顧問" />
      </Field>
      <Field label="類型">
        <SelectInput
          value={form.type}
          onChange={(v) => set("type", v)}
          options={CHANNEL_TYPES}
        />
      </Field>
      <Field label="聯絡人">
        <TextInput value={form.contact} onChange={(v) => set("contact", v)} />
      </Field>
      <Field label="電話">
        <TextInput value={form.phone} onChange={(v) => set("phone", v)} />
      </Field>
      <Field label="Email" error={errors.email}>
        <TextInput type="email" value={form.email} onChange={(v) => set("email", v)} />
      </Field>
      <Field label="狀態">
        <SelectInput
          value={form.status}
          onChange={(v) => set("status", v)}
          options={CHANNEL_STATUSES}
        />
      </Field>
      <Field label="備註">
        <TextArea value={form.notes} onChange={(v) => set("notes", v)} rows={3} />
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
