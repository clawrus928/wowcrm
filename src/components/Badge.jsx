import { s } from "../styles.js";

const STATUS_MAP = {
  "未接觸": ["#6B7280", "#F3F4F6"],
  "已約訪": ["#2563EB", "#DBEAFE"],
  "無回應": ["#D97706", "#FEF3C7"],
  "流失": ["#DC2626", "#FEE2E2"],
  "未處理": ["#6B7280", "#F3F4F6"],
  "初訪": ["#D97706", "#FEF3C7"],
  "跟進中": ["#2563EB", "#DBEAFE"],
  "報價": ["#7C3AED", "#EDE9FE"],
  "已轉客戶": ["#059669", "#D1FAE5"],
  "無效": ["#DC2626", "#FEE2E2"],
  "進行中": ["#2563EB", "#DBEAFE"],
  "已成交": ["#059669", "#D1FAE5"],
  "已流失": ["#DC2626", "#FEE2E2"],
  "草稿": ["#6B7280", "#F3F4F6"],
  "審批中": ["#D97706", "#FEF3C7"],
  "已簽署": ["#2563EB", "#DBEAFE"],
  "執行中": ["#7C3AED", "#EDE9FE"],
  "已完成": ["#059669", "#D1FAE5"],
  "已終止": ["#DC2626", "#FEE2E2"],
  "已發送": ["#2563EB", "#DBEAFE"],
  "已接受": ["#059669", "#D1FAE5"],
  "已拒絕": ["#DC2626", "#FEE2E2"],
  "已過期": ["#6B7280", "#E5E7EB"],
};

export function StatusBadge({ status }) {
  const [c, bg] = STATUS_MAP[status] || ["#6B7280", "#F3F4F6"];
  return <span style={s.badge(c, bg)}>{status}</span>;
}
