import { useMemo } from "react";
import { DEFAULT_CURRENCY, PRODUCTS, REPS } from "../constants.js";
import {
  acceptedQuoteSums,
  dealAmount,
  groupBy,
  indexById,
  fmt,
  fmtMulti,
  getRep,
  sumByCurrency,
  today,
} from "../utils.js";
import { T } from "../theme.js";

function Card({ title, children, accent }) {
  return (
    <div
      style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: T.radius,
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        ...(accent ? { borderTop: `3px solid ${accent}` } : {}),
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 1.5,
          textTransform: "uppercase",
          color: T.textTertiary,
          fontFamily: T.font,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function Stat({ value, label, color }) {
  return (
    <div>
      <div
        style={{
          fontSize: 24,
          fontWeight: 800,
          color: color || T.text,
          fontFamily: T.mono,
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
      {label && (
        <div style={{ fontSize: 11, color: T.textTertiary, marginTop: 2 }}>{label}</div>
      )}
    </div>
  );
}

function Bar({ value, max, color, label, sub }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 4,
          fontSize: 12,
          fontFamily: T.font,
        }}
      >
        <span style={{ color: T.text, fontWeight: 600 }}>{label}</span>
        <span style={{ color: T.textSecondary, fontFamily: T.mono }}>{sub}</span>
      </div>
      <div
        style={{
          height: 8,
          background: T.surfaceAlt,
          borderRadius: 4,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: color || T.accent,
            transition: "width .3s",
          }}
        />
      </div>
    </div>
  );
}

function isThisMonth(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

export function DashboardView({ store }) {
  const { leads, customers, deals, contracts, quotes, channels, suppliers, activities } = store;

  // 待辦跟進(未完成的 activities),依日期分成 逾期 / 今日 / 未來
  const followUps = useMemo(() => {
    const t = today();
    const dealById = indexById(deals);
    const customerById = indexById(customers);
    const leadById = indexById(leads);
    const nameOf = (a) => {
      if (a.relatedType === "deal") return dealById.get(a.relatedId)?.title;
      if (a.relatedType === "customer") return customerById.get(a.relatedId)?.name;
      if (a.relatedType === "lead") return leadById.get(a.relatedId)?.company;
      return null;
    };
    const pending = (activities || [])
      .filter((a) => !a.done && a.date)
      .map((a) => ({ ...a, relatedName: nameOf(a) || "—" }))
      .sort((x, y) => x.date.localeCompare(y.date));
    return {
      overdue: pending.filter((a) => a.date < t),
      todayList: pending.filter((a) => a.date === t),
      upcoming: pending.filter((a) => a.date > t),
      total: pending.length,
    };
  }, [activities, deals, customers, leads]);

  const stats = useMemo(() => {
    // Build indexes once, then look up — avoids O(channels/suppliers × all
    // records × quotes) re-scans that grow with data volume.
    const acc = acceptedQuoteSums(quotes);
    const amt = (d) => dealAmount(d, acc);
    const curOf = (d) => d.currency || DEFAULT_CURRENCY;
    // Scalar sum is only used for relative bar widths / sorting; money shown to
    // the user always goes through the per-currency map (no FX, no fake totals).

    const activeDeals = deals.filter((d) => d.status === "進行中");
    const wonDeals = deals.filter((d) => d.status === "已成交");

    const activeByProduct = groupBy(activeDeals, (d) => d.product);
    const productSummary = PRODUCTS.map((p) => {
      const ds = activeByProduct.get(p.id) || [];
      return {
        ...p,
        count: ds.length,
        amount: ds.reduce((s, d) => s + amt(d), 0),
        amountByCur: sumByCurrency(ds, amt, curOf),
      };
    });

    const activeByOwner = groupBy(activeDeals, (d) => d.owner);
    const ownerSummary = REPS.map((r) => {
      const ds = activeByOwner.get(r.id) || [];
      return {
        ...r,
        count: ds.length,
        amount: ds.reduce((s, d) => s + amt(d), 0),
        amountByCur: sumByCurrency(ds, amt, curOf),
      };
    }).sort((a, b) => b.amount - a.amount);

    const newLeadsThisMonth = leads.filter((l) => isThisMonth(l.created)).length;
    const newCustomersThisMonth = customers.filter((c) => isThisMonth(c.created)).length;
    const convertedLeads = leads.filter((l) => l.status === "已轉客戶").length;
    const conversionRate = leads.length
      ? Math.round((convertedLeads / leads.length) * 100)
      : 0;

    const totalPipeline = sumByCurrency(activeDeals, amt, curOf);
    const totalWon = sumByCurrency(wonDeals, amt, curOf);

    const dealsByCustomer = groupBy(deals, (d) => d.customerId);
    const contractsByCustomer = groupBy(contracts || [], (k) => k.customerId);
    const leadsByChannel = groupBy(leads, (l) => l.channelId);
    const customersByChannel = groupBy(customers, (c) => c.channelId);

    const channelSummary = (channels || [])
      .map((ch) => {
        const chLeads = leadsByChannel.get(ch.id) || [];
        const chCustIds = new Set((customersByChannel.get(ch.id) || []).map((c) => c.id));
        for (const l of chLeads) {
          if (l.convertedCustomerId) chCustIds.add(l.convertedCustomerId);
        }
        const wonDealsForCh = [];
        let commission = 0;
        for (const id of chCustIds) {
          for (const d of dealsByCustomer.get(id) || []) {
            if (d.status === "已成交") wonDealsForCh.push(d);
          }
          for (const k of contractsByCustomer.get(id) || []) {
            commission += Number(k.internalCommissionAmount) || 0;
          }
        }
        const won = wonDealsForCh.reduce((s, d) => s + amt(d), 0);
        return {
          ...ch,
          leadCount: chLeads.length,
          customerCount: chCustIds.size,
          wonAmount: won,
          wonByCur: sumByCurrency(wonDealsForCh, amt, curOf),
          commission,
        };
      })
      .sort((a, b) => b.wonAmount - a.wonAmount || b.leadCount - a.leadCount);

    const dealsBySupplier = groupBy(deals, (d) => d.supplierId);
    const supplierSummary = (suppliers || [])
      .map((sp) => {
        const spDeals = dealsBySupplier.get(sp.id) || [];
        const spActive = spDeals.filter((d) => d.status === "進行中");
        const spWon = spDeals.filter((d) => d.status === "已成交");
        const activeAmount = spActive.reduce((s, d) => s + amt(d), 0);
        const wonAmount = spWon.reduce((s, d) => s + amt(d), 0);
        return {
          ...sp,
          dealCount: spDeals.length,
          activeAmount,
          wonAmount,
          activeByCur: sumByCurrency(spActive, amt, curOf),
        };
      })
      .filter((sp) => sp.dealCount > 0)
      .sort((a, b) => b.activeAmount + b.wonAmount - (a.activeAmount + a.wonAmount));

    // 階段分佈計數（product|stage → count），render 時 O(1) 查表
    const stageCounts = new Map();
    for (const d of activeDeals) {
      const key = d.product + "|" + d.stage;
      stageCounts.set(key, (stageCounts.get(key) || 0) + 1);
    }

    const productMax = Math.max(1, ...productSummary.map((x) => x.amount));

    return {
      productSummary,
      ownerSummary,
      channelSummary,
      supplierSummary,
      activeDeals,
      wonDeals,
      newLeadsThisMonth,
      newCustomersThisMonth,
      convertedLeads,
      conversionRate,
      totalPipeline,
      totalWon,
      stageCounts,
      productMax,
    };
  }, [leads, customers, deals, contracts, quotes, channels, suppliers]);

  const maxOwnerAmount = Math.max(1, ...stats.ownerSummary.map((o) => o.amount));

  return (
    <div
      style={{
        flex: 1,
        overflow: "auto",
        padding: 16,
        background: T.bg,
      }}
    >
      <div style={{ marginBottom: 16 }}>
        <h2
          style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 800,
            color: T.text,
            fontFamily: T.font,
          }}
        >
          儀表板
        </h2>
        <div style={{ fontSize: 12, color: T.textTertiary, marginTop: 4 }}>
          數據總覽 · 即時更新
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <Card title="進行中商機">
          <Stat value={stats.activeDeals.length} label="筆" />
          <div style={{ fontSize: 12, color: T.textSecondary, fontFamily: T.mono }}>
            {fmtMulti(stats.totalPipeline)}
          </div>
        </Card>
        <Card title="已成交">
          <Stat value={stats.wonDeals.length} label="筆" color="#059669" />
          <div style={{ fontSize: 12, color: T.textSecondary, fontFamily: T.mono }}>
            {fmtMulti(stats.totalWon)}
          </div>
        </Card>
        <Card title="本月新線索">
          <Stat value={stats.newLeadsThisMonth} label="筆" color={T.accent} />
        </Card>
        <Card title="本月新客戶">
          <Stat value={stats.newCustomersThisMonth} label="筆" color="#2563EB" />
        </Card>
        <Card title="線索轉化率">
          <Stat value={`${stats.conversionRate}%`} label={`已轉 ${stats.convertedLeads} / ${leads.length}`} color="#7C3AED" />
        </Card>
        <Card title="合同 / 報價">
          <Stat value={`${contracts.length} / ${quotes.length}`} label="合同 / 報價" />
        </Card>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 12,
        }}
      >
        <Card
          title={`待辦跟進（${followUps.total}）`}
          accent={followUps.overdue.length > 0 ? "#DC2626" : undefined}
        >
          {followUps.total === 0 ? (
            <div style={{ fontSize: 12, color: T.textTertiary }}>
              暫無待辦。在商機 / 客戶 / 線索詳情用「計劃下一步」建立跟進。
            </div>
          ) : (
            [
              ...followUps.overdue.map((a) => ({ ...a, _tag: "逾期", _color: "#DC2626" })),
              ...followUps.todayList.map((a) => ({ ...a, _tag: "今日", _color: "#D97706" })),
              ...followUps.upcoming.map((a) => ({ ...a, _tag: null, _color: T.textTertiary })),
            ]
              .slice(0, 8)
              .map((a) => (
                <div
                  key={a.id}
                  style={{
                    padding: "7px 0",
                    borderBottom: `1px solid ${T.borderLight}`,
                    display: "flex",
                    alignItems: "baseline",
                    gap: 8,
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontFamily: T.mono,
                      color: a._color,
                      fontWeight: a._tag ? 700 : 400,
                      flexShrink: 0,
                    }}
                  >
                    {a.date.slice(5)}
                  </span>
                  {a._tag && (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: a._color,
                        flexShrink: 0,
                      }}
                    >
                      {a._tag}
                    </span>
                  )}
                  <span
                    style={{
                      fontSize: 12,
                      color: T.text,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      flex: 1,
                    }}
                  >
                    {a.kind} · {a.relatedName}
                    {a.note && (
                      <span style={{ color: T.textTertiary }}> — {a.note}</span>
                    )}
                  </span>
                  <span
                    style={{ fontSize: 11, color: T.textTertiary, flexShrink: 0 }}
                  >
                    {getRep(a.owner)?.name || "—"}
                  </span>
                </div>
              ))
          )}
          {followUps.total > 8 && (
            <div style={{ fontSize: 11, color: T.textTertiary, marginTop: 4 }}>
              …另有 {followUps.total - 8} 筆
            </div>
          )}
        </Card>

        <Card title="產品線 Pipeline">
          {stats.productSummary.map((p) => {
            return (
              <Bar
                key={p.id}
                value={p.amount}
                max={stats.productMax}
                color={p.color}
                label={`${p.icon} ${p.name}`}
                sub={`${p.count} 筆 · ${fmtMulti(p.amountByCur)}`}
              />
            );
          })}
        </Card>

        <Card title="業務排行（進行中商機）">
          {stats.ownerSummary.map((o) => (
            <Bar
              key={o.id}
              value={o.amount}
              max={maxOwnerAmount}
              color={T.accent}
              label={o.name}
              sub={`${o.count} 筆 · ${fmtMulti(o.amountByCur)}`}
            />
          ))}
        </Card>

        <Card title="渠道方表現">
          {stats.channelSummary.length === 0 ? (
            <div style={{ fontSize: 12, color: T.textTertiary }}>暫無渠道資料</div>
          ) : (
            <>
              {stats.channelSummary.slice(0, 6).map((ch) => (
                <div
                  key={ch.id}
                  style={{
                    padding: "8px 0",
                    borderBottom: `1px solid ${T.borderLight}`,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                      marginBottom: 3,
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>
                      {ch.name}
                      <span
                        style={{
                          fontSize: 10,
                          color: T.textTertiary,
                          marginLeft: 6,
                          fontWeight: 400,
                        }}
                      >
                        {ch.type}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: ch.wonAmount > 0 ? "#059669" : T.textTertiary,
                        fontFamily: T.mono,
                      }}
                    >
                      {ch.wonAmount > 0 ? fmtMulti(ch.wonByCur, { dashWhenEmpty: true }) : "—"}
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: T.textTertiary }}>
                    {ch.leadCount} 線索 · {ch.customerCount} 客戶
                    {ch.commission > 0 && (
                      <span style={{ marginLeft: 8, color: T.accent }}>
                        內部佣金 {fmt(ch.commission)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </>
          )}
        </Card>

        <Card title="供應商表現">
          {stats.supplierSummary.length === 0 ? (
            <div style={{ fontSize: 12, color: T.textTertiary }}>暫無供應商資料</div>
          ) : (
            stats.supplierSummary.slice(0, 6).map((sp) => (
              <div
                key={sp.id}
                style={{
                  padding: "8px 0",
                  borderBottom: `1px solid ${T.borderLight}`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    marginBottom: 3,
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>
                    {sp.name}
                    <span
                      style={{
                        fontSize: 10,
                        color: T.textTertiary,
                        marginLeft: 6,
                        fontWeight: 400,
                      }}
                    >
                      {sp.type}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: sp.activeAmount > 0 ? "#2563EB" : T.textTertiary,
                      fontFamily: T.mono,
                    }}
                  >
                    {sp.activeAmount > 0 ? fmtMulti(sp.activeByCur, { dashWhenEmpty: true }) : "—"}
                  </div>
                </div>
                <div style={{ fontSize: 11, color: T.textTertiary }}>
                  {sp.dealCount} 商機
                  {sp.wonAmount > 0 && (
                    <span style={{ marginLeft: 8, color: "#059669" }}>
                      已成交 {fmt(sp.wonAmount)}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </Card>

        <Card title="商機階段分佈">
          {PRODUCTS.map((p) => (
            <div key={p.id} style={{ marginBottom: 12 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: p.color,
                  marginBottom: 6,
                  fontFamily: T.font,
                }}
              >
                {p.icon} {p.name}
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                {p.stages.map((stage) => {
                  const c = stats.stageCounts.get(p.id + "|" + stage) || 0;
                  return (
                    <div
                      key={stage}
                      style={{
                        flex: 1,
                        background: c > 0 ? `${p.color}15` : T.surfaceAlt,
                        borderRadius: 4,
                        padding: "6px 4px",
                        textAlign: "center",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color: c > 0 ? p.color : T.textTertiary,
                          fontFamily: T.mono,
                        }}
                      >
                        {c}
                      </div>
                      <div
                        style={{
                          fontSize: 9,
                          color: T.textTertiary,
                          marginTop: 2,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {stage}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
