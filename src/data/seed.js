export const SEED_LEADS = [
  { id: "l1", name: "莊麗雲", company: "康健生活藥房", phone: "6633-3221", status: "未接觸", source: "官網", owner: "u1", collaborators: [], created: "2026-03-16" },
  { id: "l2", name: "李錦添", company: "李錦記廚房", phone: "6630-0993", status: "未接觸", source: "官網", owner: "u2", collaborators: ["u1"], created: "2026-03-16" },
  { id: "l3", name: "吳秀芳", company: "唯一專業美容", phone: "6633-0055", status: "已約訪", source: "渠道方", channelId: "ch1", owner: "u1", collaborators: [], created: "2026-03-16" },
  { id: "l4", name: "雷少芳", company: "烏佬茶寮美食", phone: "6303-3383", status: "已約訪", source: "展覽", owner: "u3", collaborators: [], created: "2026-02-11" },
  { id: "l5", name: "劉美華", company: "RUBY BOUTIQUE", phone: "6688-8866", status: "已約訪", source: "渠道方", channelId: "ch3", owner: "u1", collaborators: ["u4"], created: "2026-02-11" },
  { id: "l6", name: "梁家駒", company: "比竹面", phone: "6666-5304", status: "無回應", source: "電話開發", owner: "u4", collaborators: [], created: "2026-02-11" },
  { id: "l7", name: "張燦泳", company: "7星國際食品", phone: "6630-3339", status: "已約訪", source: "渠道方", channelId: "ch2", owner: "u2", collaborators: ["u3"], created: "2026-02-11" },
  { id: "l8", name: "陳鎮濤", company: "源生藥房", phone: "6869-8484", status: "流失", source: "官網", owner: "u1", collaborators: [], created: "2026-02-10" },
];

export const SEED_CUSTOMERS = [
  { id: "c1", name: "鴻海精密", corpGroup: "鴻海集團", industry: "科技", address: "新北市土城區", owner: "u1", collaborators: ["u3"], status: "初訪", source: "渠道方", channelId: "ch1", created: "2026-02-15" },
  { id: "c2", name: "群創光電", corpGroup: "鴻海集團", industry: "科技", address: "苗栗縣竹南鎮", owner: "u3", collaborators: [], status: "跟進中", source: "展覽", created: "2026-03-01" },
  { id: "c3", name: "台積電", corpGroup: null, industry: "科技", address: "新竹市科學園區", owner: "u1", collaborators: ["u2"], status: "報價", source: "官網", created: "2026-01-20" },
  { id: "c4", name: "國泰金控", corpGroup: "國泰集團", industry: "金融", address: "台北市信義區", owner: "u2", collaborators: [], status: "初訪", source: "電話開發", created: "2026-03-20" },
  { id: "c5", name: "統一超商", corpGroup: "統一集團", industry: "零售", address: "台北市松山區", owner: "u1", collaborators: ["u3", "u4"], status: "跟進中", source: "轉介紹", created: "2026-02-28" },
  { id: "c6", name: "聯發科", corpGroup: null, industry: "科技", address: "新竹市科學園區", owner: "u4", collaborators: ["u2"], status: "報價", source: "展覽", created: "2026-03-10" },
  { id: "c7", name: "佳爵食坊", corpGroup: null, industry: "餐飲", address: "澳門氹仔", owner: "u2", collaborators: [], status: "初訪", source: "官網", created: "2026-03-26" },
  { id: "c8", name: "光大數碼科技", corpGroup: null, industry: "零售", address: "澳門皇朝區", owner: "u1", collaborators: [], status: "報價", source: "廣告", created: "2026-03-23" },
];

export const SEED_DEALS = [
  { id: "d1", title: "智慧工廠顧問", customerId: "c1", product: "consulting", stage: "執行中", amount: 1800000, status: "進行中", supplierId: "sp1", owner: "u1", collaborators: ["u2"], created: "2026-03-01" },
  { id: "d2", title: "產線設備升級", customerId: "c1", product: "hardware", stage: "出貨中", amount: 5200000, status: "進行中", supplierId: "sp2", owner: "u3", collaborators: [], created: "2026-02-15" },
  { id: "d3", title: "製程最佳化顧問", customerId: "c3", product: "consulting", stage: "提案中", amount: 2400000, status: "進行中", supplierId: "sp1", owner: "u1", collaborators: [], created: "2026-03-10" },
  { id: "d4", title: "僱主品牌行銷", customerId: "c3", product: "marketing", stage: "執行中", amount: 980000, status: "進行中", supplierId: "sp3", owner: "u4", collaborators: ["u1"], created: "2026-02-20" },
  { id: "d5", title: "POS 系統更新", customerId: "c5", product: "hardware", stage: "安裝中", amount: 1200000, status: "進行中", supplierId: "sp2", owner: "u3", collaborators: ["u1"], created: "2026-02-28" },
  { id: "d6", title: "數位轉型顧問", customerId: "c4", product: "consulting", stage: "需求分析", amount: 1500000, status: "進行中", supplierId: null, owner: "u2", collaborators: [], created: "2026-03-20" },
  { id: "d7", title: "全球品牌推廣", customerId: "c6", product: "marketing", stage: "需求確認", amount: 1100000, status: "進行中", supplierId: "sp3", owner: "u4", collaborators: ["u2"], created: "2026-03-22" },
  { id: "d8", title: "AI 策略諮詢", customerId: "c3", product: "consulting", stage: "已完成", amount: 680000, status: "已成交", supplierId: "sp1", owner: "u1", collaborators: [], created: "2025-12-10" },
];

export const SEED_CONTACTS = [
  { id: "ct1", customerId: "c1", name: "陳小華", role: "IT 總監", phone: "02-2268-5678", email: "chen@foxconn.com", owner: "u1", collaborators: [], created: "2026-02-15" },
  { id: "ct2", customerId: "c1", name: "劉建志", role: "採購經理", phone: "02-2268-9012", email: "liu@foxconn.com", owner: "u1", collaborators: ["u3"], created: "2026-02-15" },
  { id: "ct3", customerId: "c3", name: "王大明", role: "VP Engineering", phone: "03-563-1234", email: "wang@tsmc.com", owner: "u1", collaborators: ["u2"], created: "2026-01-20" },
  { id: "ct4", customerId: "c5", name: "黃建民", role: "營運長", phone: "02-2747-8901", email: "huang@7-11.com", owner: "u1", collaborators: [], created: "2026-02-28" },
  { id: "ct5", customerId: "c6", name: "林志偉", role: "CTO", phone: "03-567-8901", email: "lin@mediatek.com", owner: "u4", collaborators: ["u2"], created: "2026-03-10" },
  { id: "ct6", customerId: "c3", name: "李芳如", role: "採購主管", phone: "03-563-5678", email: "li@tsmc.com", owner: "u2", collaborators: [], created: "2026-01-22" },
  { id: "ct7", customerId: "c4", name: "張美玲", role: "數位長", phone: "02-2326-9012", email: "chang@cathay.com", owner: "u2", collaborators: [], created: "2026-03-20" },
  { id: "ct8", customerId: "c7", name: "李國強", role: "店長", phone: "6628-1234", email: "li@jueju.com", owner: "u2", collaborators: [], created: "2026-03-26" },
];

export const SEED_CONTRACTS = [
  { id: "k1", title: "鴻海智慧工廠顧問合同", customerId: "c1", dealId: "d1", amount: 1800000, status: "執行中", signDate: "2026-03-10", startDate: "2026-03-15", endDate: "2026-09-15", owner: "u1", collaborators: ["u2"], created: "2026-03-08" },
  { id: "k2", title: "鴻海產線設備採購合同", customerId: "c1", dealId: "d2", amount: 5200000, status: "已簽署", signDate: "2026-02-28", startDate: "2026-03-01", endDate: "2026-06-30", owner: "u3", collaborators: [], created: "2026-02-25" },
  { id: "k3", title: "台積電 AI 策略諮詢合同", customerId: "c3", dealId: "d8", amount: 680000, status: "已完成", signDate: "2025-12-15", startDate: "2025-12-20", endDate: "2026-03-20", owner: "u1", collaborators: [], created: "2025-12-12" },
  { id: "k4", title: "統一超商 POS 安裝合同", customerId: "c5", dealId: "d5", amount: 1200000, status: "執行中", signDate: "2026-03-05", startDate: "2026-03-10", endDate: "2026-06-10", owner: "u3", collaborators: ["u1"], created: "2026-03-03" },
  { id: "k5", title: "國泰金控顧問合同", customerId: "c4", dealId: "d6", amount: 1500000, status: "草稿", signDate: null, startDate: null, endDate: null, owner: "u2", collaborators: [], created: "2026-03-25" },
];

export const SEED_CHANNELS = [
  { id: "ch1", name: "明日商業顧問", type: "二級代理", contact: "陳明日", phone: "2828-1234", email: "ming@tomorrow.com", commissionRate: 10, status: "啟用", notes: "主要負責澳門中區商戶", owner: "u1", created: "2026-01-15" },
  { id: "ch2", name: "南灣推廣", type: "外判銷售", contact: "李南灣", phone: "2851-7788", email: "li@nanwan.com", commissionRate: 8, status: "啟用", notes: "外判團隊 3 人", owner: "u2", created: "2026-02-01" },
  { id: "ch3", name: "Joe Lam", type: "推薦人", contact: "Joe Lam", phone: "6688-9900", email: "joe@personal.com", commissionRate: 5, status: "啟用", notes: "個人推薦，按單計", owner: "u1", created: "2026-02-20" },
  { id: "ch4", name: "氹仔商會", type: "二級代理", contact: "黃會長", phone: "2883-2233", email: "wong@taipa-biz.org", commissionRate: 12, status: "停用", notes: "暫停合作中", owner: "u3", created: "2025-11-10" },
];

export const SEED_SUPPLIERS = [
  { id: "sp1", name: "華科技術", type: "顧問合作方", contact: "張工", phone: "2851-9001", email: "zhang@huake.com", paymentTerms: "30 天結款", status: "啟用", notes: "智慧工廠顧問首選", owner: "u1", created: "2026-01-10" },
  { id: "sp2", name: "鼎盛電子", type: "硬體供應商", contact: "林經理", phone: "2851-9002", email: "lin@dingsheng.com", paymentTerms: "預付 50%, 出貨前付清", status: "啟用", notes: "主力 POS / 工業設備", owner: "u3", created: "2026-01-12" },
  { id: "sp3", name: "創意星廣告", type: "行銷合作方", contact: "Maggie 周", phone: "2851-9003", email: "maggie@creativestar.com", paymentTerms: "月結", status: "啟用", notes: "品牌行銷外包", owner: "u4", created: "2026-02-05" },
  { id: "sp4", name: "速捷物流", type: "物流商", contact: "李司機", phone: "2851-9004", email: "li@subjet.com", paymentTerms: "貨到付款", status: "啟用", notes: "澳門全區當天送達", owner: "u3", created: "2026-02-10" },
  { id: "sp5", name: "全達安裝", type: "安裝商", contact: "黃師傅", phone: "2851-9005", email: "wong@chuenta.com", paymentTerms: "完工後 14 天", status: "停用", notes: "上次合作品質有問題", owner: "u3", created: "2025-12-08" },
];

export const SEED_QUOTES = [
  { id: "q1", title: "鴻海設備報價 - Phase 2", customerId: "c1", dealId: "d2", amount: 3800000, status: "已發送", validUntil: "2026-04-30", owner: "u3", collaborators: [], created: "2026-03-20" },
  { id: "q2", title: "台積電顧問服務報價", customerId: "c3", dealId: "d3", amount: 2400000, status: "草稿", validUntil: "2026-05-15", owner: "u1", collaborators: [], created: "2026-03-22" },
  { id: "q3", title: "聯發科品牌行銷報價", customerId: "c6", dealId: "d7", amount: 1100000, status: "已發送", validUntil: "2026-04-20", owner: "u4", collaborators: ["u2"], created: "2026-03-24" },
  { id: "q4", title: "群創光電設備報價", customerId: "c2", dealId: "d3", amount: 3400000, status: "已接受", validUntil: "2026-04-10", owner: "u3", collaborators: [], created: "2026-03-15" },
  { id: "q5", title: "統一企業行銷方案報價", customerId: "c5", dealId: null, amount: 750000, status: "已過期", validUntil: "2026-03-01", owner: "u4", collaborators: [], created: "2026-02-15" },
  { id: "q6", title: "國泰金控數位轉型報價", customerId: "c4", dealId: "d6", amount: 1500000, status: "已發送", validUntil: "2026-04-25", owner: "u2", collaborators: [], created: "2026-03-26" },
];
