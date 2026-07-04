# CLAUDE.md

WOW CRM — 多產品 Pipeline CRM,給澳門 11 人業務團隊用。生產環境:`wowcrm.wowmac.com`,PR 合併到 master 即自動部署,**改動會直接影響真實使用者與真實資料**。

## 技術棧

- 前端:React 18 + Vite 5,純 inline styles(design tokens 在 `src/theme.js`)
- 後端:Node 20 + Fastify 4 + SQLite(`server/src/`),通用 JSON 記錄存儲
- 部署:Docker → GitHub Actions → EC2

## 結構

```
src/
  App.jsx              主路由
  theme.js / styles.js 設計系統
  constants.js         列舉值、REPS、PRODUCTS
  utils.js             fmt()、幣別/金額 helpers
  data/store.js        useCrmStore hook(async CRUD)
  components/          共用元件(Drawer, DataTable, fields, LineItemsEditor...)
  views/               每個模組一個檔,export 一個主 function component
server/
  src/index.js         Fastify 路由
  src/db.js            SQLite schema + CRUD
docs/playbook/         AI 作業制度(調度、判斷、範本、教訓)
```

## 驗證(改完必做,不要跳過)

```bash
npm run build                    # 前端;通過才 commit
```

改到 `server/src/*` 時 build 不夠——**必須**照 `docs/playbook/diagnosis.md` 第三節做 server 冒煙測試(`/tmp` 測試 DB + curl 實打端點)。宣稱「完成」前先過 `docs/playbook/judgment.md` 的完成定義。

## 風格硬規則

- UI 文字用**繁體中文**
- 金額永遠帶幣別:`fmt(amount, currency)`,預設 MOP;跨幣別用 `sumByCurrency`/`fmtMulti`,不可直接相加
- 用 inline styles,不寫 CSS 檔;表單欄位用 `src/components/fields.jsx`
- 新 entity 三處註冊:`server/src/db.js` ENTITIES + `server/src/index.js` ID_PREFIX + `src/data/store.js` ENTITY_KEYS(漏一處執行期才炸)

## 禁止

- **不要改** `.github/workflows/deploy.yml`(除非使用者明確要求)
- **不要改** 任何 `.env` / secrets
- **不要碰** `/data/` 或 `/var/lib/wowcrm/`(生產資料;測試 DB 一律用 /tmp)
- **不要** `git push --force`。唯一預先核准的例外:用 `--force-with-lease` 重建「已全部合併進 master」的指定工作分支;其餘任何 force push 都要先問使用者
- **不要** 加不必要的 npm 依賴(能用原生 JS 就用)

## 按需路由(遇到什麼,讀什麼;不要預先全讀)

| 情境 | 讀 |
|---|---|
| 開工、要派 subagent、選模型 | `docs/playbook/model-dispatch.md` |
| 不確定「算不算完成/該不該問使用者/要不要換路」 | `docs/playbook/judgment.md` |
| 要交辦任務給 subagent | `docs/playbook/templates.md`(抄範本填空) |
| 常見浪費與雷區 | `docs/playbook/diagnosis.md` |
| 踩過的雷、歷史教訓 | `docs/playbook/lessons.md` |
| 要改 playbook / CLAUDE.md 本身 | `docs/playbook/maintenance.md` |
| 資料模型、設計決定、PR 歷史 | `PROJECT.md` |
| REST API 端點與 schema | `API_DOC.md` |
| 列舉值、產品線、階段定義 | `src/constants.js`(直接讀原始碼) |

## 開工儀式(每個 session 前 2 分鐘)

1. `git log --oneline -5` + `git status` — 看清接手點,有沒有未合併分支
2. 任務超過 3 步 → TaskCreate 分組;每組完成即 build + commit
3. 大量讀取/掃描/批次改動 → 派 subagent,主對話只收結論(見 model-dispatch.md)
