import { useEffect } from "react";
import { COMPANY } from "../data/company.js";
import { DEFAULT_CURRENCY } from "../constants.js";
import { fmt, getCustomer, quoteBreakdown } from "../utils.js";
import { T } from "../theme.js";

// Full-screen printable rendering of a quote / contract, formatted to match
// the WOW Macau Excel template. Browser "Save as PDF" via the print dialog
// produces a clean handout for the customer.
export function QuotePrintView({ record, kind = "quote", customers, onClose }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const currency = record.currency || DEFAULT_CURRENCY;
  const items = record.items || [];
  const addOns = record.addOns || [];
  const b = quoteBreakdown(record);
  const cust = getCustomer(record.customerId, customers);

  const titleZh = kind === "contract" ? "合  同" : "報 價 單";
  const docNo = record.id;
  const docDate = record.created || "";

  return (
    <>
      <div
        onClick={onClose}
        className="qpv-overlay no-print"
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          zIndex: 1000,
        }}
      />
      <div
        className="qpv-window no-print"
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          margin: "auto",
          maxWidth: 840,
          maxHeight: "94vh",
          background: "#fff",
          borderRadius: 8,
          boxShadow: "0 24px 80px rgba(0,0,0,0.3)",
          zIndex: 1001,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          className="no-print"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "10px 14px",
            borderBottom: `1px solid ${T.borderLight}`,
            background: T.surface,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>
            預覽 — {titleZh.replace(/\s/g, "")}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => window.print()}
              style={{
                padding: "7px 16px",
                borderRadius: 5,
                border: "none",
                background: T.accent,
                color: "#fff",
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
                fontFamily: T.font,
              }}
            >
              🖨 列印 / 存 PDF
            </button>
            <button
              onClick={onClose}
              style={{
                padding: "7px 14px",
                borderRadius: 5,
                border: `1.5px solid ${T.border}`,
                background: T.surface,
                color: T.textSecondary,
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
                fontFamily: T.font,
              }}
            >
              關閉
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", background: "#f3f3f3", padding: 20 }}>
          <Page
            record={record}
            cust={cust}
            kind={kind}
            currency={currency}
            items={items}
            addOns={addOns}
            breakdown={b}
            titleZh={titleZh}
            docNo={docNo}
            docDate={docDate}
          />
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: A4; margin: 14mm; }
          body * { visibility: hidden; }
          .qpv-print, .qpv-print * { visibility: visible; }
          .qpv-print {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: #fff;
            box-shadow: none;
            border-radius: 0;
            padding: 0;
            margin: 0;
          }
          .no-print { display: none !important; }
        }
      `}</style>
    </>
  );
}

function Page({
  record,
  cust,
  kind,
  currency,
  items,
  addOns,
  breakdown,
  titleZh,
  docNo,
  docDate,
}) {
  return (
    <div
      className="qpv-print"
      style={{
        background: "#fff",
        margin: "0 auto",
        padding: "28px 36px",
        maxWidth: 760,
        fontFamily: T.font,
        color: "#111",
        fontSize: 13,
        lineHeight: 1.55,
        boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 6,
        }}
      >
        <Logo />
        <div style={{ textAlign: "center", flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: 0.5 }}>
            {COMPANY.name}
          </div>
          <div style={{ fontSize: 11, color: "#1d4ed8" }}>
            Tel:{COMPANY.tel}　Fax:{COMPANY.fax}
          </div>
        </div>
        <div style={{ width: 88 }} />
      </div>

      <div
        style={{
          textAlign: "center",
          fontSize: 22,
          fontWeight: 800,
          letterSpacing: 6,
          margin: "16px 0 18px",
        }}
      >
        {titleZh}
      </div>

      {/* Header info */}
      <table style={{ width: "100%", marginBottom: 14, fontSize: 12 }}>
        <tbody>
          <tr>
            <Td label width={90}>
              {kind === "contract" ? "合同編號" : "報價編號"}
            </Td>
            <Td>{docNo}</Td>
            <Td label width={70}>
              日期
            </Td>
            <Td>{docDate}</Td>
          </tr>
          <tr>
            <Td label>客戶名稱</Td>
            <Td colSpan={3}>{cust?.name || ""}</Td>
          </tr>
          <tr>
            <Td label>項目</Td>
            <Td colSpan={3}>{record.title}</Td>
          </tr>
          {record.validUntil && (
            <tr>
              <Td label>有效期限</Td>
              <Td colSpan={3}>{record.validUntil}</Td>
            </tr>
          )}
          <tr>
            <Td label>總數</Td>
            <Td colSpan={3}>
              <span style={{ fontWeight: 700 }}>
                {fmt(breakdown.totalCommitment, currency)}
              </span>
            </Td>
          </tr>
        </tbody>
      </table>

      {/* Items table */}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: 12,
          marginBottom: 12,
        }}
      >
        <thead>
          <tr>
            <Th width={60}>數量</Th>
            <Th>明細</Th>
            <Th width={120} align="right">
              單價
            </Th>
            <Th width={130} align="right">
              項目合計
            </Th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <Td colSpan={4} center muted>
                （無項目）
              </Td>
            </tr>
          ) : (
            items.map((it, idx) => {
              const qty = Number(it.quantity) || 0;
              const price = Number(it.unitPrice) || 0;
              const pct = Number(it.discountPct) || 0;
              const sub = qty * price * (1 - pct / 100);
              return (
                <tr key={it.id || idx} style={{ verticalAlign: "top" }}>
                  <Td>{qty}{it.billingType && it.billingType !== "一次性" ? ` ${it.billingType}` : ""}</Td>
                  <Td>
                    <div style={{ fontWeight: 700 }}>{it.name}</div>
                    {it.description && (
                      <div
                        style={{
                          fontSize: 11,
                          color: "#444",
                          whiteSpace: "pre-wrap",
                          marginTop: 2,
                        }}
                      >
                        {it.description}
                      </div>
                    )}
                  </Td>
                  <Td align="right">
                    {fmt(price, currency)}
                    {pct > 0 && (
                      <div style={{ fontSize: 10, color: "#059669" }}>
                        −{pct}%
                      </div>
                    )}
                  </Td>
                  <Td align="right">
                    <strong>{fmt(sub, currency)}</strong>
                  </Td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      {/* Add-on breakdown */}
      {(breakdown.lineDiscount > 0 ||
        breakdown.addOnDiscount > 0 ||
        breakdown.addOnFee > 0) && (
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 12,
            marginBottom: 12,
          }}
        >
          <tbody>
            <tr>
              <Td colSpan={3} align="right" muted>
                原價合計
              </Td>
              <Td align="right">{fmt(breakdown.subtotal, currency)}</Td>
            </tr>
            {breakdown.lineDiscount > 0 && (
              <tr>
                <Td colSpan={3} align="right" muted>
                  項目折扣
                </Td>
                <Td align="right" color="#059669">
                  −{fmt(breakdown.lineDiscount, currency)}
                </Td>
              </tr>
            )}
            {(addOns || [])
              .filter((a) => a.kind === "discount" && Number(a.amount) > 0)
              .map((a) => {
                const amt =
                  breakdown.afterLineDiscount * (Number(a.amount) / 100);
                return (
                  <tr key={a.id}>
                    <Td colSpan={3} align="right" muted>
                      {a.name || "折扣"} −{a.amount}%
                    </Td>
                    <Td align="right" color="#059669">
                      −{fmt(amt, currency)}
                    </Td>
                  </tr>
                );
              })}
            {(addOns || [])
              .filter((a) => a.kind === "fee" && Number(a.amount) > 0)
              .map((a) => (
                <tr key={a.id}>
                  <Td colSpan={3} align="right" muted>
                    {a.name || "加值費"}
                  </Td>
                  <Td align="right" color="#D97706">
                    {fmt(Number(a.amount), currency)}
                  </Td>
                </tr>
              ))}
          </tbody>
        </table>
      )}

      {/* Total */}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <tbody>
          <tr>
            <Td colSpan={3} align="right" bold>
              總數
            </Td>
            <Td align="right" bold large>
              {fmt(breakdown.totalCommitment, currency)}
            </Td>
          </tr>
        </tbody>
      </table>

      {/* Payment / terms */}
      <div style={{ marginTop: 18, fontSize: 11.5 }}>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>付款明細</div>
        <ol style={{ margin: "0 0 0 18px", padding: 0 }}>
          <li>支票抬付請填寫：&ldquo;{COMPANY.bank.payee}&rdquo;</li>
          <li>
            銀行轉帳到：銀行名稱：{COMPANY.bank.bankName}　 帳戶號碼：
            {COMPANY.bank.accountNumber}
            <br />
            <span style={{ color: "#666" }}>
              **轉帳後請電郵收據到 {COMPANY.email} 或傳真
            </span>
          </li>
          <li>如有更改，請致電或電郵本公司</li>
        </ol>
      </div>

      {/* Signatures */}
      <div
        style={{
          display: "flex",
          gap: 24,
          marginTop: 56,
          fontSize: 12,
        }}
      >
        <div style={{ flex: 1, borderTop: "1px solid #333", paddingTop: 6 }}>
          甲方：
        </div>
        <div style={{ flex: 1, borderTop: "1px solid #333", paddingTop: 6 }}>
          乙方：{COMPANY.name}
        </div>
      </div>
    </div>
  );
}

function Logo() {
  // Simple text-based logo since we don't have an image asset.
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
      }}
    >
      <div
        style={{
          background: T.accent,
          color: "#fff",
          padding: "3px 9px",
          borderRadius: 5,
          fontWeight: 900,
          letterSpacing: 1.5,
          fontSize: 16,
        }}
      >
        WOW
      </div>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#666" }}>MACAU</div>
    </div>
  );
}

function Th({ children, width, align = "left" }) {
  return (
    <th
      style={{
        width,
        textAlign: align,
        background: "#f5f5f5",
        border: "1px solid #999",
        padding: "6px 8px",
        fontSize: 11,
        fontWeight: 700,
      }}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  label,
  width,
  colSpan,
  align = "left",
  bold,
  large,
  center,
  muted,
  color,
}) {
  return (
    <td
      colSpan={colSpan}
      style={{
        width,
        textAlign: center ? "center" : align,
        border: "1px solid #999",
        padding: "5px 8px",
        background: label ? "#fafafa" : "transparent",
        fontWeight: label || bold ? 700 : 400,
        fontSize: large ? 14 : undefined,
        color: color || (muted ? "#666" : undefined),
        verticalAlign: "top",
      }}
    >
      {children}
    </td>
  );
}
