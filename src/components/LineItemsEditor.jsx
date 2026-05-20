import { fmt, newId, quoteBreakdown, suggestTierDiscount } from "../utils.js";
import { T } from "../theme.js";
import { s } from "../styles.js";
import { NumberInput, SearchSelect, TextArea, TextInput } from "./fields.jsx";

// Each line item shape:
// { id, pricingId?, name, quantity, unitPrice, cost, discountPct?,
//   billingType?, description? }

export function emptyLineItem() {
  return {
    id: newId("li"),
    pricingId: null,
    name: "",
    quantity: 1,
    unitPrice: 0,
    cost: 0,
    discountPct: 0,
    billingType: "一次性",
    description: "",
  };
}

// Backwards-compat shim — callers used totalsFor() to get {total, totalCost,
// margin} before discounts / add-ons existed. Now we route through the full
// breakdown but only return the same trio so existing call sites keep working.
export function totalsFor(items) {
  const b = quoteBreakdown({ items });
  return {
    total: b.afterLineDiscount,
    totalCost: b.totalCost,
    margin: b.afterLineDiscount - b.totalCost,
  };
}

export function LineItemsEditor({ items, onChange, pricings, currency = "MOP" }) {
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
    const current = list[idx] || {};
    const qty = Number(current.quantity) || 1;
    const suggested = suggestTierDiscount(p, qty);
    updateAt(idx, {
      pricingId: p.id,
      name: p.name,
      unitPrice: Number(p.price) || 0,
      cost: Number(p.cost) || 0,
      billingType: p.billingType || "一次性",
      description: p.description || "",
      discountPct: suggested, // auto-apply tier on pick
    });
  };

  const breakdown = quoteBreakdown({ items: list });
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
          currency={currency}
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
        <Row label="原價合計" value={fmt(breakdown.subtotal, currency)} />
        {breakdown.lineDiscount > 0 && (
          <Row
            label="項目折扣"
            value={`-${fmt(breakdown.lineDiscount, currency)}`}
            color="#059669"
          />
        )}
        <div
          style={{
            borderTop: `1px solid ${T.borderLight}`,
            marginTop: 6,
            paddingTop: 6,
          }}
        />
        <Row label="小計" value={fmt(breakdown.afterLineDiscount, currency)} bold accent />
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
          🔒 內部 — 項目成本 / 毛利
        </div>
        <Row label="總成本" value={fmt(breakdown.totalCost, currency)} compact />
        <Row
          label="毛利（折扣後）"
          value={`${fmt(breakdown.afterLineDiscount - breakdown.totalCost, currency)} (${
            breakdown.afterLineDiscount > 0
              ? Math.round(
                  ((breakdown.afterLineDiscount - breakdown.totalCost) /
                    breakdown.afterLineDiscount) *
                    100
                )
              : 0
          }%)`}
          compact
          color={
            breakdown.afterLineDiscount - breakdown.totalCost > 0
              ? "#059669"
              : "#DC2626"
          }
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

function ItemCard({ item, idx, pricings, currency, onPick, onChange, onRemove }) {
  const gross = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
  const pct = Math.max(0, Math.min(100, Number(item.discountPct) || 0));
  const subtotal = gross * (1 - pct / 100);

  // Tier hint: if the picked pricing has tiers and the current discountPct
  // doesn't match the suggested tier for the current quantity, surface a
  // one-click suggestion.
  const pickedPricing = item.pricingId
    ? pricings.find((p) => p.id === item.pricingId)
    : null;
  const tierSuggestion = pickedPricing
    ? suggestTierDiscount(pickedPricing, item.quantity)
    : 0;
  const showTierHint = tierSuggestion > 0 && tierSuggestion !== pct;
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
            label: `${p.name}　${fmt(p.price || 0, p.currency || "MOP")}（${p.category}）`,
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

      <SubField label="說明（會顯示在列印的報價單內）">
        <TextArea
          value={item.description}
          onChange={(v) => onChange({ description: v })}
          rows={3}
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
          <SubField label="折扣 %">
            <NumberInput
              value={item.discountPct}
              onChange={(v) => onChange({ discountPct: v ?? 0 })}
            />
          </SubField>
          {showTierHint && (
            <button
              type="button"
              onClick={() => onChange({ discountPct: tierSuggestion })}
              style={{
                marginTop: -4,
                background: "none",
                border: "none",
                color: T.accent,
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                padding: 0,
                fontFamily: T.font,
              }}
            >
              套用階梯折扣 {tierSuggestion}%（{item.quantity} 件）
            </button>
          )}
        </div>
        <div style={{ flex: 1 }}>
          <SubField label="成本（MOP / 內部）">
            <NumberInput
              value={item.cost}
              onChange={(v) => onChange({ cost: v ?? 0 })}
            />
          </SubField>
        </div>
      </div>

      <div
        style={{
          marginTop: 4,
          padding: "8px 10px",
          background: T.surfaceAlt,
          borderRadius: T.radiusSm,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          fontFamily: T.mono,
          fontSize: 12,
        }}
      >
        <span style={{ color: T.textTertiary }}>
          {item.quantity} × {fmt(item.unitPrice, currency)}
          {pct > 0 && (
            <span style={{ marginLeft: 6, color: "#059669" }}>
              −{pct}%
            </span>
          )}
        </span>
        <span style={{ fontWeight: 700, color: T.text, fontSize: 14 }}>
          {fmt(subtotal, currency)}
        </span>
      </div>
    </div>
  );
}

// Quote / contract level add-ons: stackable percentage discounts and absolute
// fees that show up below the line items in the breakdown.
//
// Each add-on shape: { id, kind: "discount"|"fee", name, amount }
export function AddOnsEditor({ addOns, onChange, presets }) {
  const list = addOns || [];
  const add = (preset) => {
    const base = preset
      ? { ...preset, id: newId("ao") }
      : { id: newId("ao"), name: "", kind: "discount", amount: 0 };
    onChange([...list, base]);
  };
  const update = (idx, patch) =>
    onChange(list.map((a, i) => (i === idx ? { ...a, ...patch } : a)));
  const remove = (idx) => onChange(list.filter((_, i) => i !== idx));

  return (
    <div>
      {list.length === 0 && (
        <div
          style={{
            padding: 12,
            border: `1.5px dashed ${T.border}`,
            borderRadius: T.radiusSm,
            textAlign: "center",
            color: T.textTertiary,
            fontSize: 12,
            marginBottom: 8,
          }}
        >
          尚未加入優惠 / 加值費
        </div>
      )}

      {list.map((a, idx) => (
        <AddOnRow
          key={a.id}
          addOn={a}
          onChange={(patch) => update(idx, patch)}
          onRemove={() => remove(idx)}
        />
      ))}

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
        {(presets || []).map((p) => (
          <button
            key={p.name + p.kind}
            type="button"
            onClick={() => add(p)}
            style={{
              padding: "5px 10px",
              borderRadius: 999,
              border: `1.5px solid ${T.border}`,
              background: T.surface,
              color: T.textSecondary,
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: T.font,
            }}
          >
            ＋ {p.name}
            {p.kind === "discount" && p.amount > 0 ? ` −${p.amount}%` : ""}
            {p.kind === "fee" ? "（加值費）" : ""}
          </button>
        ))}
        <button
          type="button"
          onClick={() => add()}
          style={{
            padding: "5px 10px",
            borderRadius: 999,
            border: `1.5px dashed ${T.border}`,
            background: "transparent",
            color: T.accent,
            fontSize: 11,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: T.font,
          }}
        >
          ＋ 自訂
        </button>
      </div>
    </div>
  );
}

function AddOnRow({ addOn, onChange, onRemove }) {
  return (
    <div
      style={{
        border: `1px solid ${T.borderLight}`,
        borderLeft:
          addOn.kind === "discount"
            ? `3px solid #05966940`
            : `3px solid #D9770640`,
        borderRadius: T.radiusSm,
        padding: 10,
        marginBottom: 8,
        background: T.surface,
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      <select
        value={addOn.kind}
        onChange={(e) => onChange({ kind: e.target.value })}
        style={{
          ...s.select,
          padding: "6px 8px",
          fontSize: 11,
          flexShrink: 0,
        }}
      >
        <option value="discount">折扣 %</option>
        <option value="fee">加值費</option>
      </select>
      <input
        type="text"
        value={addOn.name}
        placeholder={addOn.kind === "discount" ? "名稱（例：組合購）" : "名稱（例：廣告充值）"}
        onChange={(e) => onChange({ name: e.target.value })}
        style={{ ...s.input, padding: "6px 10px", fontSize: 12, flex: 1, minWidth: 0 }}
      />
      <div style={{ width: 100, flexShrink: 0 }}>
        <NumberInput
          value={addOn.amount}
          onChange={(v) => onChange({ amount: v ?? 0 })}
        />
      </div>
      <span style={{ fontSize: 11, color: T.textTertiary, flexShrink: 0 }}>
        {addOn.kind === "discount" ? "%" : "MOP"}
      </span>
      <button
        type="button"
        onClick={onRemove}
        style={{
          background: "none",
          border: "none",
          color: "#DC2626",
          fontSize: 14,
          cursor: "pointer",
          padding: 4,
          flexShrink: 0,
        }}
      >
        ×
      </button>
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
