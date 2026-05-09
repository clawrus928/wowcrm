import { fmt, newId } from "../utils.js";
import { T } from "../theme.js";
import { s } from "../styles.js";
import { NumberInput, SearchSelect, TextInput } from "./fields.jsx";

// Each line item shape:
// { id, pricingId?, name, quantity, unitPrice, cost, billingType?, description? }

export function emptyLineItem() {
  return {
    id: newId("li"),
    pricingId: null,
    name: "",
    quantity: 1,
    unitPrice: 0,
    cost: 0,
    billingType: "一次性",
    description: "",
  };
}

export function totalsFor(items) {
  const list = items || [];
  const total = list.reduce(
    (sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0),
    0
  );
  const totalCost = list.reduce(
    (sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.cost) || 0),
    0
  );
  return { total, totalCost, margin: total - totalCost };
}

export function LineItemsEditor({ items, onChange, pricings }) {
  const list = items || [];

  const updateAt = (idx, patch) => {
    const next = list.map((it, i) => (i === idx ? { ...it, ...patch } : it));
    onChange(next);
  };

  const removeAt = (idx) => {
    onChange(list.filter((_, i) => i !== idx));
  };

  const addBlank = () => onChange([...list, emptyLineItem()]);

  const pickPricing = (idx, pricingId) => {
    const p = (pricings || []).find((x) => x.id === pricingId);
    if (!p) return updateAt(idx, { pricingId: null });
    updateAt(idx, {
      pricingId: p.id,
      name: p.name,
      unitPrice: Number(p.price) || 0,
      cost: Number(p.cost) || 0,
      billingType: p.billingType || "一次性",
      description: p.description || "",
    });
  };

  const { total, totalCost, margin } = totalsFor(list);
  const activePricings = (pricings || []).filter((p) => p.status !== "停用");

  return (
    <div>
      {list.length === 0 && (
        <div
          style={{
            padding: 14,
            border: `1.5px dashed ${T.border}`,
            borderRadius: T.radiusSm,
            textAlign: "center",
            color: T.textTertiary,
            fontSize: 12,
            marginBottom: 8,
          }}
        >
          尚未加入任何收費項目
        </div>
      )}

      {list.map((it, idx) => (
        <ItemCard
          key={it.id || idx}
          item={it}
          idx={idx}
          pricings={activePricings}
          onPick={(id) => pickPricing(idx, id)}
          onChange={(patch) => updateAt(idx, patch)}
          onRemove={() => removeAt(idx)}
        />
      ))}

      <button
        type="button"
        onClick={addBlank}
        style={{
          width: "100%",
          padding: "10px 14px",
          border: `1.5px dashed ${T.border}`,
          borderRadius: T.radiusSm,
          background: T.surface,
          color: T.accent,
          fontWeight: 600,
          fontSize: 13,
          cursor: "pointer",
          fontFamily: T.font,
          marginTop: 4,
        }}
      >
        ＋ 新增項目
      </button>

      <div
        style={{
          marginTop: 12,
          padding: "12px 14px",
          background: T.surfaceAlt,
          borderRadius: T.radiusSm,
        }}
      >
        <Row label="合計" value={fmt(total)} bold accent />
      </div>

      <div
        style={{
          marginTop: 8,
          padding: "10px 12px",
          background: "#FEF3C7",
          border: "1px solid #FCD34D",
          borderRadius: T.radiusSm,
          fontSize: 12,
          color: "#92400E",
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 1.5,
            textTransform: "uppercase",
            marginBottom: 6,
          }}
        >
          🔒 內部 — 成本 / 毛利
        </div>
        <Row label="總成本" value={fmt(totalCost)} compact />
        <Row
          label="毛利"
          value={`${fmt(margin)} (${total > 0 ? Math.round((margin / total) * 100) : 0}%)`}
          compact
          color={margin > 0 ? "#059669" : "#DC2626"}
        />
      </div>
    </div>
  );
}

function Row({ label, value, bold, accent, compact, color }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        padding: compact ? "2px 0" : "4px 0",
        fontSize: compact ? 12 : 13,
      }}
    >
      <span style={{ color: T.textSecondary }}>{label}</span>
      <span
        style={{
          fontFamily: T.mono,
          fontWeight: bold ? 800 : 600,
          color: color || (accent ? T.accent : T.text),
          fontSize: bold ? 16 : compact ? 12 : 13,
        }}
      >
        {value}
      </span>
    </div>
  );
}

function ItemCard({ item, idx, pricings, onPick, onChange, onRemove }) {
  const subtotal = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
  return (
    <div
      style={{
        border: `1px solid ${T.borderLight}`,
        borderLeft: `3px solid ${T.accent}40`,
        borderRadius: T.radiusSm,
        padding: 12,
        marginBottom: 8,
        background: T.surface,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: T.textTertiary,
            letterSpacing: 1,
          }}
        >
          項目 {idx + 1}
        </div>
        <button
          type="button"
          onClick={onRemove}
          style={{
            background: "none",
            border: "none",
            color: "#DC2626",
            fontSize: 12,
            cursor: "pointer",
            padding: 2,
            fontFamily: T.font,
          }}
        >
          移除
        </button>
      </div>

      <SubField label="從目錄選">
        <SearchSelect
          value={item.pricingId}
          onChange={onPick}
          placeholder="搜尋收費項目（選擇後可修改下方欄位）"
          emptyText="目錄沒有項目，請先到「收費項目」建立"
          options={pricings.map((p) => ({
            value: p.id,
            label: `${p.name}　${fmt(p.price || 0)}（${p.category}）`,
          }))}
        />
      </SubField>

      <SubField label="名稱">
        <TextInput
          value={item.name}
          onChange={(v) => onChange({ name: v })}
          placeholder="顯示在報價/合同上的項目名稱"
        />
      </SubField>

      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <SubField label="數量">
            <NumberInput
              value={item.quantity}
              onChange={(v) => onChange({ quantity: v ?? 0 })}
            />
          </SubField>
        </div>
        <div style={{ flex: 1 }}>
          <SubField label="單價（MOP）">
            <NumberInput
              value={item.unitPrice}
              onChange={(v) => onChange({ unitPrice: v ?? 0 })}
            />
          </SubField>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <SubField label="成本（MOP / 內部）">
            <NumberInput
              value={item.cost}
              onChange={(v) => onChange({ cost: v ?? 0 })}
            />
          </SubField>
        </div>
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "flex-end",
            paddingBottom: 6,
          }}
        >
          <div
            style={{
              fontSize: 12,
              color: T.textSecondary,
              fontFamily: T.font,
              textAlign: "right",
            }}
          >
            <div style={{ fontSize: 10, color: T.textTertiary }}>小計</div>
            <div
              style={{ fontFamily: T.mono, fontWeight: 700, color: T.text }}
            >
              {fmt(subtotal)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SubField({ label, children }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <label
        style={{
          display: "block",
          fontSize: 11,
          fontWeight: 600,
          color: T.textSecondary,
          marginBottom: 4,
          fontFamily: T.font,
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}
