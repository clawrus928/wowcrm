import { useState } from "react";
import { PRODUCTS } from "../constants.js";
import { fmt, getCustomer, getRep } from "../utils.js";
import { T } from "../theme.js";

export function PipelineView({ store, onOpenSupplier }) {
  const { deals, customers, suppliers } = store;
  const [activeProduct, setActiveProduct] = useState(PRODUCTS[0].id);
  const [dragId, setDragId] = useState(null);

  const product = PRODUCTS.find((p) => p.id === activeProduct);
  const stages = product?.stages || [];
  const pipelineDeals = deals.filter(
    (d) => d.product === activeProduct && d.status === "進行中"
  );

  const handleDrop = (stage) => {
    if (dragId) {
      store.moveDealStage(dragId, stage);
      setDragId(null);
    }
  };

  const totalAmount = pipelineDeals.reduce((acc, d) => acc + d.amount, 0);
  const totalCount = pipelineDeals.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div
        style={{
          padding: "14px 16px",
          borderBottom: `1px solid ${T.borderLight}`,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 800,
              color: T.text,
              fontFamily: T.font,
            }}
          >
            Pipeline 看板
          </h2>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 12, color: T.textTertiary, fontFamily: T.mono }}>
              {totalCount} 筆
            </span>
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: product?.color || T.text,
                fontFamily: T.mono,
              }}
            >
              {fmt(totalAmount)}
            </span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {PRODUCTS.map((p) => {
            const active = activeProduct === p.id;
            const count = deals.filter(
              (d) => d.product === p.id && d.status === "進行中"
            ).length;
            return (
              <button
                key={p.id}
                onClick={() => setActiveProduct(p.id)}
                style={{
                  padding: "6px 14px",
                  borderRadius: 20,
                  border: active
                    ? `1.5px solid ${p.color}`
                    : `1.5px solid ${T.border}`,
                  background: active ? `${p.color}10` : "transparent",
                  color: active ? p.color : T.textSecondary,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: T.font,
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  whiteSpace: "nowrap",
                }}
              >
                <span>{p.icon}</span> {p.name}
                <span
                  style={{
                    fontSize: 10,
                    background: active ? `${p.color}20` : T.surfaceAlt,
                    borderRadius: 8,
                    padding: "1px 6px",
                    fontFamily: T.mono,
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          gap: 10,
          padding: "12px 12px",
          overflowX: "auto",
          overflowY: "hidden",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {stages.map((stage) => {
          const stageDeals = pipelineDeals.filter((d) => d.stage === stage);
          const stageTotal = stageDeals.reduce((acc, d) => acc + d.amount, 0);
          return (
            <PipelineColumn
              key={stage}
              stage={stage}
              deals={stageDeals}
              customers={customers}
              suppliers={suppliers}
              product={product}
              stageTotal={stageTotal}
              onDrop={() => handleDrop(stage)}
              onDragId={setDragId}
              allStages={stages}
              onMoveDeal={(id, s) => store.moveDealStage(id, s)}
              onOpenSupplier={onOpenSupplier}
            />
          );
        })}
      </div>
    </div>
  );
}

function PipelineColumn({
  stage,
  deals,
  customers,
  suppliers,
  product,
  stageTotal,
  onDrop,
  onDragId,
  allStages,
  onMoveDeal,
  onOpenSupplier,
}) {
  const [over, setOver] = useState(false);
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        onDrop();
      }}
      style={{
        flex: `0 0 ${Math.max(220, 100 / allStages.length)}%`,
        minWidth: 220,
        maxWidth: 300,
        display: "flex",
        flexDirection: "column",
        background: over ? `${product.color}06` : T.surfaceAlt,
        borderRadius: T.radius,
        border: over
          ? `1.5px solid ${product.color}30`
          : `1px solid ${T.borderLight}`,
        transition: "all .15s",
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "10px 12px 8px", borderBottom: `1px solid ${T.borderLight}` }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 2,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div
              style={{ width: 7, height: 7, borderRadius: "50%", background: product.color }}
            />
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: T.text,
                fontFamily: T.font,
              }}
            >
              {stage}
            </span>
          </div>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: T.textTertiary,
              background: T.surface,
              borderRadius: 10,
              padding: "1px 8px",
              fontFamily: T.mono,
            }}
          >
            {deals.length}
          </span>
        </div>
        <div
          style={{
            fontSize: 12,
            color: product.color,
            fontWeight: 600,
            fontFamily: T.mono,
          }}
        >
          {fmt(stageTotal)}
        </div>
      </div>

      <div style={{ flex: 1, padding: "6px 8px", overflowY: "auto", minHeight: 80 }}>
        {deals.map((d) => (
          <PipelineCard
            key={d.id}
            deal={d}
            customers={customers}
            suppliers={suppliers}
            product={product}
            onDragStart={() => onDragId(d.id)}
            allStages={allStages}
            currentStage={stage}
            onMoveDeal={onMoveDeal}
            onOpenSupplier={onOpenSupplier}
          />
        ))}
        {deals.length === 0 && (
          <div
            style={{
              padding: 20,
              textAlign: "center",
              color: T.textTertiary,
              fontSize: 12,
            }}
          >
            拖曳至此
          </div>
        )}
      </div>
    </div>
  );
}

function PipelineCard({
  deal,
  customers,
  suppliers,
  product,
  onDragStart,
  allStages,
  currentStage,
  onMoveDeal,
  onOpenSupplier,
}) {
  const cust = getCustomer(deal.customerId, customers);
  const supplier = deal.supplierId
    ? suppliers?.find((sp) => sp.id === deal.supplierId)
    : null;
  const stageIdx = allStages.indexOf(currentStage);
  const prev = stageIdx > 0 ? allStages[stageIdx - 1] : null;
  const next = stageIdx < allStages.length - 1 ? allStages[stageIdx + 1] : null;

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text", deal.id);
        onDragStart();
        e.currentTarget.style.opacity = "0.4";
      }}
      onDragEnd={(e) => {
        e.currentTarget.style.opacity = "1";
      }}
      style={{
        background: T.surface,
        border: `1px solid ${T.borderLight}`,
        borderLeft: `3px solid ${product.color}`,
        borderRadius: T.radiusSm,
        padding: "10px 11px",
        marginBottom: 6,
        cursor: "grab",
        transition: "box-shadow .12s",
        WebkitTapHighlightColor: "transparent",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)")}
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
    >
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: T.text,
          fontFamily: T.font,
          marginBottom: 4,
          lineHeight: 1.3,
        }}
      >
        {deal.title}
      </div>
      <div style={{ fontSize: 11, color: T.textTertiary, marginBottom: 6 }}>
        {cust?.name || "—"} · {getRep(deal.owner)?.name}
      </div>
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: product.color,
          fontFamily: T.mono,
          marginBottom: 6,
        }}
      >
        {fmt(deal.amount)}
      </div>
      {supplier && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenSupplier?.(supplier.id);
          }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 3,
            padding: "2px 7px",
            marginBottom: 6,
            borderRadius: 4,
            border: "1px solid #BAE6FD",
            background: "#E0F2FE",
            color: "#0369A1",
            fontSize: 10,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: T.font,
          }}
        >
          ⚒ {supplier.name}
        </button>
      )}
      <div style={{ display: "flex", gap: 4 }}>
        {prev && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMoveDeal(deal.id, prev);
            }}
            style={{
              flex: 1,
              padding: "4px 0",
              borderRadius: 4,
              border: `1px solid ${T.border}`,
              background: T.surfaceAlt,
              color: T.textSecondary,
              fontSize: 10,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: T.font,
            }}
          >
            ← {prev.length > 3 ? prev.slice(0, 3) + "…" : prev}
          </button>
        )}
        {next && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMoveDeal(deal.id, next);
            }}
            style={{
              flex: 1,
              padding: "4px 0",
              borderRadius: 4,
              border: `1px solid ${product.color}30`,
              background: `${product.color}08`,
              color: product.color,
              fontSize: 10,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: T.font,
            }}
          >
            {next.length > 3 ? next.slice(0, 3) + "…" : next} →
          </button>
        )}
      </div>
    </div>
  );
}
