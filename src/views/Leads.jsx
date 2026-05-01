import { useMemo, useState } from "react";
import { LEAD_SOURCES, LEAD_STATUSES, REPS } from "../constants.js";
import { getRep } from "../utils.js";
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

const EMPTY_LEAD = {
  name: "",
  company: "",
  phone: "",
  status: "未接觸",
  source: "官網",
  owner: null,
  collaborators: [],
};

export function LeadsView({ store, drawerSeed, onConsumeSeed, onOpenChannel }) {
  const { leads, customers, channels, currentUser } = store;
  const [tab, setTab] = useState("all");
  const [fStatus, setFStatus] = useState("all");
  const [fSource, setFSource] = useState("all");
  const [search, setSearch] = useState("");
  const [drawer, setDrawer] = useState(null); // { mode: "detail"|"edit"|"create"|"convert", id?: }

  if (drawerSeed && !drawer) {
    setDrawer(drawerSeed);
    onConsumeSeed?.();
  }

  const filtered = useMemo(() => {
    let d = leads;
    if (tab === "mine") d = d.filter((x) => x.owner === currentUser);
    if (tab === "collab") d = d.filter((x) => x.collaborators.includes(currentUser));
    if (fStatus !== "all") d = d.filter((x) => x.status === fStatus);
    if (fSource !== "all") d = d.filter((x) => x.source === fSource);
    if (search) d = d.filter((x) => x.name.includes(search) || x.company.includes(search));
    return d;
  }, [leads, tab, fStatus, fSource, search]);

  const current = drawer?.id ? leads.find((l) => l.id === drawer.id) : null;

  const columns = [
    {
      key: "name",
      label: "姓名",
      render: (r) => <span style={s.link}>{r.name}</span>,
    },
    { key: "company", label: "商戶名稱" },
    { key: "phone", label: "手機", mono: true },
    {
      key: "status",
      label: "跟進狀態",
      render: (r) => <StatusBadge status={r.status} />,
    },
    { key: "source", label: "線索來源" },
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
        title="線索"
        count={filtered.length}
        addLabel="新增線索"
        onAdd={() => setDrawer({ mode: "create" })}
      />
      <OwnerTabs active={tab} onChange={setTab} />
      <FilterRow>
        <select style={s.select} value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
          <option value="all">跟進狀態：全部</option>
          {LEAD_STATUSES.map((x) => (
            <option key={x} value={x}>
              {x}
            </option>
          ))}
        </select>
        <select style={s.select} value={fSource} onChange={(e) => setFSource(e.target.value)}>
          <option value="all">線索來源：全部</option>
          {LEAD_SOURCES.map((x) => (
            <option key={x} value={x}>
              {x}
            </option>
          ))}
        </select>
        <div style={{ marginLeft: "auto" }}>
          <input
            style={{ ...s.input, width: 200, padding: "6px 10px", fontSize: 12 }}
            placeholder="搜尋姓名/商戶名稱"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </FilterRow>
      <DataTable
        columns={columns}
        data={filtered}
        emptyText="找不到符合條件的線索"
        onRowClick={(r) => setDrawer({ mode: "detail", id: r.id })}
      />

      {drawer?.mode === "detail" && current && (
        <LeadDetailDrawer
          lead={current}
          customers={customers}
          channels={channels}
          onOpenChannel={onOpenChannel}
          onClose={() => setDrawer(null)}
          onEdit={() => setDrawer({ mode: "edit", id: current.id })}
          onConvert={() => setDrawer({ mode: "convert", id: current.id })}
          onDelete={async () => {
            if (!confirm(`確定刪除線索「${current.name}」？`)) return;
            try {
              await store.removeItem("leads", current.id);
              setDrawer(null);
            } catch (err) {
              alert(err.message || "刪除失敗");
            }
          }}
        />
      )}

      {(drawer?.mode === "create" || drawer?.mode === "edit") && (
        <LeadFormDrawer
          initial={drawer.mode === "edit" ? current : { ...EMPTY_LEAD, owner: currentUser }}
          mode={drawer.mode}
          channels={channels}
          onClose={() => setDrawer(null)}
          onSubmit={async (data) => {
            try {
              if (drawer.mode === "edit") {
                await store.updateItem("leads", current.id, data);
                setDrawer({ mode: "detail", id: current.id });
              } else {
                const created = await store.addItem("leads", data);
                setDrawer({ mode: "detail", id: created.id });
              }
            } catch (err) {
              alert(err.message || "儲存失敗");
            }
          }}
        />
      )}

      {drawer?.mode === "convert" && current && (
        <ConvertLeadDrawer
          lead={current}
          onClose={() => setDrawer({ mode: "detail", id: current.id })}
          onSubmit={async (customerData) => {
            try {
              const newCust = await store.convertLeadToCustomer(current.id, customerData);
              alert(`已轉為客戶：${newCust.name}`);
              setDrawer(null);
            } catch (err) {
              alert(err.message || "轉換失敗");
            }
          }}
        />
      )}
    </div>
  );
}

function LeadDetailDrawer({
  lead,
  customers,
  channels,
  onOpenChannel,
  onClose,
  onEdit,
  onConvert,
  onDelete,
}) {
  const linkedCustomer = lead.convertedCustomerId
    ? customers.find((c) => c.id === lead.convertedCustomerId)
    : null;
  const channel = lead.channelId
    ? channels?.find((c) => c.id === lead.channelId)
    : null;
  const canConvert = lead.status !== "已轉客戶" && !lead.convertedCustomerId;
  return (
    <Drawer
      open
      title={`線索 · ${lead.name}`}
      onClose={onClose}
      footer={
        <>
          <button onClick={onDelete} style={s.btnDanger}>
            刪除
          </button>
          <div style={{ flex: 1 }} />
          {canConvert && (
            <button onClick={onConvert} style={s.btn(false)}>
              轉為客戶
            </button>
          )}
          <button onClick={onEdit} style={s.btn(true)}>
            編輯
          </button>
        </>
      }
    >
      <DetailSection title="基本資料">
        <DetailRow label="姓名">{lead.name}</DetailRow>
        <DetailRow label="商戶名稱">{lead.company}</DetailRow>
        <DetailRow label="手機">
          <span style={{ fontFamily: T.mono }}>{lead.phone}</span>
        </DetailRow>
        <DetailRow label="跟進狀態">
          <StatusBadge status={lead.status} />
        </DetailRow>
        <DetailRow label="線索來源">{lead.source}</DetailRow>
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
        <DetailRow label="負責人">{getRep(lead.owner)?.name}</DetailRow>
        <DetailRow label="協作人">
          {lead.collaborators.length
            ? lead.collaborators.map((id) => getRep(id)?.name).join("、")
            : null}
        </DetailRow>
        <DetailRow label="創建時間">
          <span style={{ fontFamily: T.mono }}>{lead.created}</span>
        </DetailRow>
      </DetailSection>

      {linkedCustomer && (
        <DetailSection title="已轉客戶">
          <DetailRow label="客戶">{linkedCustomer.name}</DetailRow>
        </DetailSection>
      )}
    </Drawer>
  );
}

function LeadFormDrawer({ initial, mode, channels, onClose, onSubmit }) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.name?.trim()) e.name = "請輸入姓名";
    if (!form.company?.trim()) e.company = "請輸入商戶名稱";
    if (!form.phone?.trim()) e.phone = "請輸入手機";
    if (form.source === "渠道方" && !form.channelId)
      e.channelId = "請選擇渠道方";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const activeChannels = (channels || []).filter((c) => c.status === "啟用");

  return (
    <Drawer
      open
      title={mode === "edit" ? `編輯線索` : "新增線索"}
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
      <Field label="姓名" required error={errors.name}>
        <TextInput value={form.name} onChange={(v) => set("name", v)} />
      </Field>
      <Field label="商戶名稱" required error={errors.company}>
        <TextInput value={form.company} onChange={(v) => set("company", v)} />
      </Field>
      <Field label="手機" required error={errors.phone}>
        <TextInput value={form.phone} onChange={(v) => set("phone", v)} />
      </Field>
      <Field label="跟進狀態">
        <SelectInput
          value={form.status}
          onChange={(v) => set("status", v)}
          options={LEAD_STATUSES}
        />
      </Field>
      <Field label="線索來源">
        <SelectInput
          value={form.source}
          onChange={(v) => {
            setForm((f) => ({
              ...f,
              source: v,
              channelId: v === "渠道方" ? f.channelId : null,
            }));
          }}
          options={LEAD_SOURCES}
        />
      </Field>
      {form.source === "渠道方" && (
        <Field label="渠道方" required error={errors.channelId}>
          <SelectInput
            value={form.channelId}
            onChange={(v) => set("channelId", v)}
            placeholder="請選擇"
            options={activeChannels.map((c) => ({
              value: c.id,
              label: `${c.name}（${c.type}）`,
            }))}
          />
        </Field>
      )}
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

function ConvertLeadDrawer({ lead, onClose, onSubmit }) {
  const [form, setForm] = useState({
    name: lead.company,
    corpGroup: null,
    industry: "其他",
    address: "",
    status: "初訪",
    source: lead.source,
    channelId: lead.channelId || null,
    owner: lead.owner,
    collaborators: lead.collaborators,
  });
  const [errors, setErrors] = useState({});
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
      title="轉為客戶"
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
            建立客戶
          </button>
        </>
      }
    >
      <div
        style={{
          background: T.accentBg,
          color: T.accentText,
          padding: "10px 12px",
          borderRadius: 6,
          fontSize: 12,
          marginBottom: 14,
        }}
      >
        將線索「{lead.name} · {lead.company}」轉為客戶。線索狀態會更新為「已轉客戶」。
      </div>
      <Field label="商戶名稱" required error={errors.name}>
        <TextInput value={form.name} onChange={(v) => set("name", v)} />
      </Field>
      <Field label="集團（可選）">
        <TextInput value={form.corpGroup || ""} onChange={(v) => set("corpGroup", v || null)} />
      </Field>
      <Field label="所屬行業">
        <SelectInput
          value={form.industry}
          onChange={(v) => set("industry", v)}
          options={[
            "科技",
            "金融",
            "零售",
            "製造",
            "餐飲",
            "醫療",
            "教育",
            "貿易",
            "其他",
          ]}
        />
      </Field>
      <Field label="地址">
        <TextInput value={form.address} onChange={(v) => set("address", v)} />
      </Field>
    </Drawer>
  );
}
