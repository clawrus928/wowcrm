import { useMemo, useState } from "react";
import { CONTRACT_STATUSES, REPS } from "../constants.js";
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
  SearchSelect,
  SelectInput,
  TextArea,
  TextInput,
} from "../components/fields.jsx";

const EMPTY_CONTRACT = {
  title: "",
  customerId: null,
  dealId: null,
  amount: 0,
  status: "草稿",
  signDate: null,
  startDate: null,
  endDate: null,
  internalCommissionAmount: 0,
  internalNotes: "",
  owner: null,
  collaborators: [],
};

export function ContractsView({ store }) {
  const { contracts, customers, deals, currentUser } = store;
  const [tab, setTab] = useState("all");
  const [fStatus, setFStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [drawer, setDrawer] = useState(null);

  const filtered = useMemo(() => {
    let d = contracts;
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
  }, [contracts, customers, tab, fStatus, search]);

  const current = drawer?.id ? contracts.find((c) => c.id === drawer.id) : null;

  const columns = [
    {
      key: "title",
      label: "合同名稱",
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
      label: "合同金額",
      mono: true,
      render: (r) => <span style={{ fontWeight: 600, color: T.text }}>{fmt(r.amount)}</span>,
    },
    {
      key: "status",
      label: "狀態",
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: "signDate",
      label: "簽約日期",
      mono: true,
      render: (r) => r.signDate || "—",
    },
    {
      key: "endDate",
      label: "到期日期",
      mono: true,
      render: (r) => r.endDate || "—",
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
        title="合同"
        count={filtered.length}
        addLabel="新增合同"
        onAdd={() => setDrawer({ mode: "create" })}
      />
      <OwnerTabs active={tab} onChange={setTab} />
      <FilterRow>
        <select style={s.select} value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
          <option value="all">狀態：全部</option>
          {CONTRACT_STATUSES.map((x) => (
            <option key={x} value={x}>
              {x}
            </option>
          ))}
        </select>
        <div style={{ marginLeft: "auto" }}>
          <input
            style={{ ...s.input, width: 200, padding: "6px 10px", fontSize: 12 }}
            placeholder="搜尋合同名稱/客戶"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </FilterRow>
      <DataTable
        columns={columns}
        data={filtered}
        emptyText="找不到符合條件的合同"
        onRowClick={(r) => setDrawer({ mode: "detail", id: r.id })}
      />

      {drawer?.mode === "detail" && current && (
        <ContractDetailDrawer
          contract={current}
          customers={customers}
          deals={deals}
          onClose={() => setDrawer(null)}
          onEdit={() => setDrawer({ mode: "edit", id: current.id })}
          onDelete={async () => {
            if (!confirm(`確定刪除合同「${current.title}」？`)) return;
            try {
              await store.removeItem("contracts", current.id);
              setDrawer(null);
            } catch (err) {
              alert(err.message || "刪除失敗");
            }
          }}
        />
      )}

      {(drawer?.mode === "create" || drawer?.mode === "edit") && (
        <ContractFormDrawer
          initial={drawer.mode === "edit" ? current : { ...EMPTY_CONTRACT, owner: currentUser }}
          mode={drawer.mode}
          customers={customers}
          deals={deals}
          onClose={() => setDrawer(null)}
          onSubmit={async (data) => {
            try {
              if (drawer.mode === "edit") {
                await store.updateItem("contracts", current.id, data);
                setDrawer({ mode: "detail", id: current.id });
              } else {
                const created = await store.addItem("contracts", data);
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

function ContractDetailDrawer({ contract, customers, deals, onClose, onEdit, onDelete }) {
  const cust = getCustomer(contract.customerId, customers);
  const deal = getDeal(contract.dealId, deals);
  return (
    <Drawer
      open
      title={`合同 · ${contract.title}`}
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
        <DetailRow label="合同名稱">{contract.title}</DetailRow>
        <DetailRow label="關聯客戶">{cust?.name}</DetailRow>
        <DetailRow label="關聯商機">{deal?.title}</DetailRow>
        <DetailRow label="金額">
          <span style={{ fontFamily: T.mono, fontWeight: 700 }}>{fmt(contract.amount)}</span>
        </DetailRow>
        <DetailRow label="狀態">
          <StatusBadge status={contract.status} />
        </DetailRow>
      </DetailSection>
      <DetailSection title="日期">
        <DetailRow label="簽約日期">
          <span style={{ fontFamily: T.mono }}>{contract.signDate}</span>
        </DetailRow>
        <DetailRow label="開始日期">
          <span style={{ fontFamily: T.mono }}>{contract.startDate}</span>
        </DetailRow>
        <DetailRow label="到期日期">
          <span style={{ fontFamily: T.mono }}>{contract.endDate}</span>
        </DetailRow>
      </DetailSection>
      <DetailSection title="負責人">
        <DetailRow label="負責人">{getRep(contract.owner)?.name}</DetailRow>
        <DetailRow label="協作人">
          {contract.collaborators.length
            ? contract.collaborators.map((id) => getRep(id)?.name).join("、")
            : null}
        </DetailRow>
        <DetailRow label="創建時間">
          <span style={{ fontFamily: T.mono }}>{contract.created}</span>
        </DetailRow>
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
          🔒 內部資訊（僅內部可見）
        </div>
        <DetailRow label="內部佣金">
          <span style={{ fontFamily: T.mono, fontWeight: 700, color: "#92400E" }}>
            {fmt(contract.internalCommissionAmount || 0)}
          </span>
        </DetailRow>
        {contract.internalNotes && (
          <DetailRow label="內部備註">
            <span style={{ whiteSpace: "pre-wrap" }}>{contract.internalNotes}</span>
          </DetailRow>
        )}
      </div>
    </Drawer>
  );
}

function ContractFormDrawer({ initial, mode, customers, deals, onClose, onSubmit }) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const dealOptions = form.customerId
    ? deals.filter((d) => d.customerId === form.customerId)
    : deals;

  const validate = () => {
    const e = {};
    if (!form.title?.trim()) e.title = "請輸入合同名稱";
    if (!form.customerId) e.customerId = "請選擇客戶";
    if (form.amount == null || form.amount < 0) e.amount = "請輸入有效金額";
    if (form.startDate && form.endDate && form.endDate < form.startDate)
      e.endDate = "到期日期不可早於開始日期";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  return (
    <Drawer
      open
      title={mode === "edit" ? "編輯合同" : "新增合同"}
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
      <Field label="合同名稱" required error={errors.title}>
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
      <Field label="金額（MOP）" required error={errors.amount}>
        <NumberInput value={form.amount} onChange={(v) => set("amount", v)} />
      </Field>
      <Field label="狀態">
        <SelectInput
          value={form.status}
          onChange={(v) => set("status", v)}
          options={CONTRACT_STATUSES}
        />
      </Field>
      <Field label="簽約日期">
        <DateInput value={form.signDate} onChange={(v) => set("signDate", v)} />
      </Field>
      <Field label="開始日期">
        <DateInput value={form.startDate} onChange={(v) => set("startDate", v)} />
      </Field>
      <Field label="到期日期" error={errors.endDate}>
        <DateInput value={form.endDate} onChange={(v) => set("endDate", v)} />
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
      <div
        style={{
          marginTop: 18,
          padding: "12px 14px",
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
            marginBottom: 10,
          }}
        >
          🔒 內部資訊（僅內部可見，不會列印給客戶）
        </div>
        <Field label="內部佣金（MOP）" hint="付給渠道方 / 推薦人的金額，依此項目實際協商">
          <NumberInput
            value={form.internalCommissionAmount}
            onChange={(v) => set("internalCommissionAmount", v)}
          />
        </Field>
        <Field label="內部備註">
          <TextArea
            value={form.internalNotes}
            onChange={(v) => set("internalNotes", v)}
            rows={2}
          />
        </Field>
      </div>
    </Drawer>
  );
}
