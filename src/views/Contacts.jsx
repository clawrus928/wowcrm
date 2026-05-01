import { useMemo, useState } from "react";
import { REPS } from "../constants.js";
import { getCustomer, getRep } from "../utils.js";
import { s } from "../styles.js";
import { T } from "../theme.js";
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

const EMPTY_CONTACT = {
  customerId: null,
  name: "",
  role: "",
  phone: "",
  email: "",
  owner: null,
  collaborators: [],
};

export function ContactsView({ store, drawerSeed, onConsumeSeed }) {
  const { contacts, customers, currentUser } = store;
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [drawer, setDrawer] = useState(null);

  if (drawerSeed && !drawer) {
    setDrawer(drawerSeed);
    onConsumeSeed?.();
  }

  const filtered = useMemo(() => {
    let d = contacts;
    if (tab === "mine") d = d.filter((x) => x.owner === currentUser);
    if (tab === "collab") d = d.filter((x) => x.collaborators.includes(currentUser));
    if (search) {
      const q = search.toLowerCase();
      d = d.filter(
        (x) =>
          x.name.includes(search) ||
          (getCustomer(x.customerId, customers)?.name || "").includes(search) ||
          x.email.toLowerCase().includes(q)
      );
    }
    return d;
  }, [contacts, customers, tab, search]);

  const current = drawer?.id ? contacts.find((c) => c.id === drawer.id) : null;

  const columns = [
    {
      key: "name",
      label: "姓名",
      render: (r) => <span style={s.link}>{r.name}</span>,
    },
    {
      key: "customer",
      label: "商戶名稱",
      render: (r) => getCustomer(r.customerId, customers)?.name || "—",
    },
    { key: "role", label: "職位" },
    { key: "phone", label: "座機", mono: true },
    { key: "email", label: "Email", mono: true },
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
        title="聯系人"
        count={filtered.length}
        addLabel="新增聯系人"
        onAdd={() => setDrawer({ mode: "create" })}
      />
      <OwnerTabs active={tab} onChange={setTab} />
      <FilterRow>
        <div style={{ marginLeft: "auto" }}>
          <input
            style={{ ...s.input, width: 220, padding: "6px 10px", fontSize: 12 }}
            placeholder="搜尋姓名/商戶/Email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </FilterRow>
      <DataTable
        columns={columns}
        data={filtered}
        emptyText="找不到符合條件的聯系人"
        onRowClick={(r) => setDrawer({ mode: "detail", id: r.id })}
      />

      {drawer?.mode === "detail" && current && (
        <ContactDetailDrawer
          contact={current}
          customers={customers}
          onClose={() => setDrawer(null)}
          onEdit={() => setDrawer({ mode: "edit", id: current.id })}
          onDelete={async () => {
            if (!confirm(`確定刪除聯系人「${current.name}」？`)) return;
            try {
              await store.removeItem("contacts", current.id);
              setDrawer(null);
            } catch (err) {
              alert(err.message || "刪除失敗");
            }
          }}
        />
      )}

      {(drawer?.mode === "create" || drawer?.mode === "edit") && (
        <ContactFormDrawer
          initial={drawer.mode === "edit" ? current : { ...EMPTY_CONTACT, owner: currentUser }}
          mode={drawer.mode}
          customers={customers}
          onClose={() => setDrawer(null)}
          onSubmit={async (data) => {
            try {
              if (drawer.mode === "edit") {
                await store.updateItem("contacts", current.id, data);
                setDrawer({ mode: "detail", id: current.id });
              } else {
                const created = await store.addItem("contacts", data);
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

function ContactDetailDrawer({ contact, customers, onClose, onEdit, onDelete }) {
  const cust = getCustomer(contact.customerId, customers);
  return (
    <Drawer
      open
      title={`聯系人 · ${contact.name}`}
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
        <DetailRow label="姓名">{contact.name}</DetailRow>
        <DetailRow label="關聯客戶">{cust?.name}</DetailRow>
        <DetailRow label="職位">{contact.role}</DetailRow>
        <DetailRow label="座機">
          <span style={{ fontFamily: T.mono }}>{contact.phone}</span>
        </DetailRow>
        <DetailRow label="Email">
          <span style={{ fontFamily: T.mono }}>{contact.email}</span>
        </DetailRow>
      </DetailSection>
      <DetailSection title="負責人">
        <DetailRow label="負責人">{getRep(contact.owner)?.name}</DetailRow>
        <DetailRow label="協作人">
          {contact.collaborators.length
            ? contact.collaborators.map((id) => getRep(id)?.name).join("、")
            : null}
        </DetailRow>
        <DetailRow label="創建時間">
          <span style={{ fontFamily: T.mono }}>{contact.created}</span>
        </DetailRow>
      </DetailSection>
    </Drawer>
  );
}

function ContactFormDrawer({ initial, mode, customers, onClose, onSubmit }) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.name?.trim()) e.name = "請輸入姓名";
    if (!form.customerId) e.customerId = "請選擇關聯客戶";
    if (form.email && !/.+@.+\..+/.test(form.email)) e.email = "Email 格式不正確";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  return (
    <Drawer
      open
      title={mode === "edit" ? "編輯聯系人" : "新增聯系人"}
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
      <Field label="關聯客戶" required error={errors.customerId}>
        <SelectInput
          value={form.customerId}
          onChange={(v) => set("customerId", v)}
          placeholder="請選擇"
          options={customers.map((c) => ({ value: c.id, label: c.name }))}
        />
      </Field>
      <Field label="職位">
        <TextInput value={form.role} onChange={(v) => set("role", v)} />
      </Field>
      <Field label="座機">
        <TextInput value={form.phone} onChange={(v) => set("phone", v)} />
      </Field>
      <Field label="Email" error={errors.email}>
        <TextInput type="email" value={form.email} onChange={(v) => set("email", v)} />
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
