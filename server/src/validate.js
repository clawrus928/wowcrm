// 後端資料驗證。對「未知欄位」刻意寬鬆（records 是 generic JSON storage），
// 但對 (a) 身分 / 關聯欄位的存在性 和 (b) 列舉值 嚴格把關 ——
// 這樣打錯欄位的 Agent 批次匯入就不會默默污染整個資料集。
//
// 列舉值鏡像自前端 src/constants.js，兩邊要同步更新。

const PRODUCT_STAGES = {
  consulting: ["需求分析", "提案中", "執行中", "驗收中", "已完成"],
  hardware: ["報價中", "採購中", "出貨中", "安裝中", "已交付"],
  marketing: ["需求確認", "策略規劃", "執行中", "成效追蹤", "已結案"],
};

const SOURCES = ["官網", "轉介紹", "渠道方", "電話開發", "展覽", "社群媒體", "廣告", "其他"];
const CURRENCIES = ["MOP", "HKD", "RMB"];

const ENUMS = {
  leads: {
    status: ["未接觸", "已約訪", "無回應", "流失", "已轉客戶"],
    source: SOURCES,
  },
  customers: {
    industry: ["科技", "金融", "零售", "製造", "餐飲", "醫療", "教育", "貿易", "其他"],
    source: SOURCES,
  },
  contacts: {},
  deals: {
    product: ["consulting", "hardware", "marketing"],
    status: ["進行中", "已成交", "已流失"],
  },
  quotes: {
    status: ["草稿", "已發送", "已接受", "已拒絕", "已過期"],
    currency: CURRENCIES,
  },
  contracts: {
    status: ["草稿", "審批中", "已簽署", "執行中", "已完成", "已終止"],
    currency: CURRENCIES,
  },
  channels: {
    type: ["二級代理", "外判銷售", "推薦人", "其他"],
    status: ["啟用", "停用"],
  },
  suppliers: {
    type: ["顧問合作方", "硬體供應商", "行銷合作方", "物流商", "安裝商", "其他"],
    status: ["啟用", "停用"],
  },
  pricings: {
    category: ["顧問服務", "硬體設備", "行銷服務", "其他"],
    billingType: ["一次性", "月付", "季付", "年付"],
    currency: CURRENCIES,
    status: ["啟用", "停用"],
  },
};

// 「成為一筆可用紀錄」的最低必填（身分 / 關聯欄位）。比前端表單寬鬆,
// 只擋掉會產生孤兒或無法使用的資料。
const REQUIRED = {
  leads: ["name"],
  customers: ["name"],
  contacts: ["customerId", "name"],
  deals: ["title", "customerId", "product", "stage"],
  quotes: ["title", "customerId"],
  contracts: ["title", "customerId"],
  channels: ["name"],
  suppliers: ["name"],
  pricings: ["name"],
};

function isEmpty(v) {
  return v === undefined || v === null || (typeof v === "string" && v.trim() === "");
}

// 驗證一筆紀錄。回傳錯誤字串陣列（空陣列 = 通過）。
// partial=true 用於 PATCH（部分更新），不檢查必填。
export function validateRecord(entity, data, { partial = false } = {}) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return ["record 必須是物件"];
  }
  const errors = [];

  if (!partial) {
    for (const field of REQUIRED[entity] || []) {
      if (isEmpty(data[field])) errors.push(`缺少必填欄位：${field}`);
    }
  }

  const enums = ENUMS[entity] || {};
  for (const [field, allowed] of Object.entries(enums)) {
    if (!isEmpty(data[field]) && !allowed.includes(data[field])) {
      errors.push(`${field} 的值「${data[field]}」不合法，必須是：${allowed.join(" / ")}`);
    }
  }

  // deals：stage 必須屬於其 product（兩者都在時才檢查）
  if (entity === "deals" && !isEmpty(data.product) && !isEmpty(data.stage)) {
    const stages = PRODUCT_STAGES[data.product];
    if (stages && !stages.includes(data.stage)) {
      errors.push(`stage「${data.stage}」不屬於產品線 ${data.product}，必須是：${stages.join(" / ")}`);
    }
  }

  return errors;
}

// 驗證某個 deal 階段是否屬於該產品線（給 /stage 端點用）。
export function isValidStage(product, stage) {
  const stages = PRODUCT_STAGES[product];
  return !stages || stages.includes(stage);
}

export { PRODUCT_STAGES };
