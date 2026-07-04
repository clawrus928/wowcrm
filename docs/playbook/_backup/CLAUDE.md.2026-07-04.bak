# CLAUDE.md

WOW CRM — 多產品 Pipeline CRM，給澳門 11 人業務團隊用。

## 技術棧

- **前端**：React 18 + Vite 5，純 inline styles（design tokens 在 `src/theme.js`）
- **後端**：Node 20 + Fastify 4 + SQLite（`server/src/`）
- **部署**：Docker → GitHub Actions → EC2（`wowcrm.wowmac.com`）

## 結構

```
src/
  App.jsx              主路由
  theme.js / styles.js 設計系統
  constants.js         列舉值、REPS、PRODUCTS
  utils.js             fmt()、helpers
  data/
    api.js             fetch wrapper
    store.js           useCrmStore hook（async CRUD）
    company.js         公司資料（列印用）
  components/          共用元件（Drawer, DataTable, fields, LineItemsEditor, QuotePrintView...）
  views/               每個模組一個檔（Leads, Customers, Deals, Pipeline, Quotes, Contracts, Channels, Suppliers, Pricings, Dashboard, Login, Sidebar, MobileBottomNav）
server/
  src/index.js         Fastify 路由
  src/db.js            SQLite schema + CRUD
```

## 驗證

改完後一定要跑：

```bash
npm run build
```

Build 通過才 commit。不要跳過。

## 風格

- UI 文字用**繁體中文**
- 貨幣：MOP / HKD / RMB（`fmt(amount, currency)` helper）
- 用 inline styles，不寫 CSS 檔
- 每個 view 是獨立檔案，export 一個主 function component
- 表單欄位用 `src/components/fields.jsx` 的元件
- 新 entity 要加到 `server/src/db.js` ENTITIES + `server/src/index.js` ID_PREFIX + `src/data/store.js` ENTITY_KEYS

## 禁止

- **不要改** `.github/workflows/deploy.yml`（除非明確要求）
- **不要改** 任何 `.env` / secrets
- **不要刪** `/data/` 或 `/var/lib/wowcrm/`（那是生產資料）
- **不要** `git push --force`
- **不要** 加不必要的 npm 依賴（能用原生 JS 就用）

## 參考

- `PROJECT.md` — 完整專案脈絡（資料模型、設計決定、PR 歷史）
- `API_DOC.md` — REST API 端點 + schema
- `src/constants.js` — 所有列舉值
