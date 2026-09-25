# WowCRM × QTStation 合併可行性與計劃

日期:2026-09-25。依據:兩邊原始碼實讀 + `qtstation/FUSION.md`(QTStation 既有的三階段構想)+ 後端逐項比對(schema/認證/路由/部署/依賴)。

## 一、結論:能合,而且比一般情況容易得多——但「合併」要先選定義

QTStation 的後端是照 WowCRM **1:1 複製**的,比對結果:
- `records` / `audit` 表、索引:**完全相同**
- Fastify + better-sqlite3 + @fastify/jwt + bcryptjs,`package.json` 六個依賴**版本逐字相同**
- API 契約(`/api/auth/*`、`/api/:entity` CRUD、`/bulk`、`/_audit`)相同;前端 client 註解明寫「Mirrors the wowcrm client contract」
- 同一台 EC2、同一套 Docker/nginx/certbot 套路,只是 port(8002/8003)、子域、DB 檔分開

真正的差異只有 **5 處**,而且都是可以決定的,不是技術障礙:

| # | 差異 | WowCRM | QTStation | 嚴重度 |
|---|---|---|---|---|
| 1 | 寫入權限 | owner-only(非本人改/刪回 403) | 任何登入者可改/刪 | 高——必須先選一套 |
| 2 | users 表 | 固定 11 人種子,無角色 | 動態建號,多 `role`/`active` 欄 | 中——migration 可解 |
| 3 | `customers` entity | 銷售客戶主檔 | 短視頻製作客戶 | 中——同名不同義,合庫會混 |
| 4 | `POST /api/:entity` 重複 id | 報錯 | 靜默 upsert | 低——統一即可 |
| 5 | bulk 上限/預設 | 500 筆,自動補 docNo/created | 1000 筆,無 | 低 |

**最大的成本不在後端,在前端**:WowCRM 是 React + Vite;QTStation 是一支約 5000 行的原生 JS `app.js`。後端合併是幾天的事,把 QTStation 的 UI 重寫成 React 是幾週的事。這決定了下面該走哪條路。

## 二、三種「合併」與建議

| 路線 | 意思 | 成本(估) | 得到什麼 |
|---|---|---|---|
| **C. 維持分開 + SSO + 資料關聯** | 兩個容器照舊;共用 `JWT_SECRET` 一次登入;QT 客戶加 `crmCustomerId` 連到 CRM 客戶 | 小(1–3 天) | 登入一次、客戶可互查;風險最低 |
| **B. 共用後端 + 兩個前端** | 一個 server、一個 SQLite;兩個前端各自不動(一個 React、一個原生 JS),由同一 server 提供 | 中(1–2 週) | 一份使用者、一份客戶、一份審計;運維減半;SSO 自然成立 |
| **A. 單一系統** | B 之上再把 QTStation UI 重寫成 React views,併入 wowcrm 側欄 | 大(數週) | 使用者體驗統一;但短視頻工作台的圖表/匯入/爬蟲配置要全部重做 |

**建議:先做 C(立刻有感),再做 B(戰略正確),A 只在你本來就想重做 QTStation 介面時才做。** 理由:C 的每一步都是 B 的前置,不會白做;B 之後兩個前端各自演進互不影響;A 的成本主要是 UI 重寫,收益是「一個網址、一個側欄」,對 11 人團隊不一定值得。

## 三、必須由你決定的事(技術上兩種都做得到,結果不同)

1. **權限模型**:合併後採哪套?建議「按 entity 設定」——CRM 的 entities(leads/customers/deals/quotes/contracts…)維持 owner-only;QT 的 entities(tasks/videos/accounts/productions…)維持全員可寫。一張設定表就能做,不必二選一。
2. **客戶主檔**:同意 FUSION.md 的方案——**WowCRM 客戶為主檔**,QTStation 的 `customers` 改名為 `qtClients`(或加 `crmCustomerId` 外鍵指向 CRM 客戶),短視頻專屬欄位留在 QT 那筆。
3. **使用者主檔**:WowCRM 的 u1–u11 為主;WowCRM 的 `users` 表補 `role`/`active` 欄(採 QT 的模型);QT 現有帳號按姓名對映到 u1–u11,對不上的手動處理。
4. **要不要走到 A**:現在不用決定,做完 B 再看。

## 四、執行計劃(每步都有驗收,可獨立上線)

### 階段 C-1:SSO(半天)
- 兩個容器的 `JWT_SECRET` 設成同一值(GitHub secrets 兩邊同步);WowCRM 後端讀 token 時容忍多出的 `role` 欄位(目前忽略,不用改)
- 前端:兩邊 localStorage key 不同(`wowcrm:token` / `qtstation:token`),改成共用一個 key 或登入後同時寫兩個
- 驗收:在 wowcrm 登入後直接開 qtstation 不用再登;反之亦然
- 風險:兩邊 user id 不同(u1 vs u_xxx)→ token 的 `sub` 在對方系統查不到使用者 → 先做階段 C-2 的對映或直接做決定 3

### 階段 C-2:使用者對齊(半天)
- WowCRM `users` 表加 `role`/`active`(QTStation `db.js` 已有 `ensureColumn` 遷移寫法可直接抄)
- QTStation 種子改成與 WowCRM 相同的 u1–u11(保留 admin),既有 QT 記錄的 `owner` 用腳本改對映後的 id
- 驗收:兩邊 `GET /api/auth/me` 回同一個 id;QT 記錄 owner 顯示正確姓名

### 階段 C-3:客戶關聯(1 天)
- QT 的客戶表單加「對應 CRM 客戶」下拉(呼叫 WowCRM `GET /api/customers`,同 token 可直接打)
- 存 `crmCustomerId`;QT 客戶卡片顯示 CRM 端的負責人/商機數(跨域讀取)
- 驗收:在 QT 選了 CRM 客戶後,兩邊點開能互相跳轉

### 階段 B-1:後端合流(3–5 天)
- 以 WowCRM `server/` 為底,合入 QT 獨有的:`/api/auth/password`、`/api/admin/users*`、`/api/state`;`ENTITIES` 加入 QT 的 9 個(`customers` 改 `qtClients`)
- 權限改成「按 entity 的 policy 表」(決定 1);`POST` 重複 id 統一為報錯(或按 entity 允許 upsert);bulk 統一 1000 筆並保留 docNo 邏輯只給 quotes/contracts
- 靜態服務:server 同時 serve `dist/`(React)與 `workbench/`(原生),路徑 `/` 與 `/qt/`;nginx 兩個子域指到同一 port,或保留兩個子域各 proxy 到不同路徑
- QTStation 的 `ops/merge-preview.sh` 已存在,先看它做到哪,可能可直接用來做資料庫合併預演
- 驗收:全部既有 API 冒煙測試通過(照 `docs/playbook/diagnosis.md` 第三節);兩個前端在同一 server 下都能登入、讀寫
- 風險:同一 SQLite 檔的寫入量翻倍——目前 11 人量級不是問題,但 crawler 匯入(bulk 1000 筆)時要避開尖峰

### 階段 B-2:資料搬遷(1 天,需停機半小時)
- 部署前備份兩個 DB(QT 的 deploy.yml 已有備份段可抄)
- 腳本:讀 `qtstation.db` 的 records/audit → 改 entity 名(`customers`→`qtClients`)、改 owner id → 寫入 `wowcrm.db`;先在 /tmp 用兩份副本跑一遍,比對筆數
- 驗收:合併後每個 entity 的筆數 = 兩邊原筆數之和;抽 10 筆比對 JSON 一致;審計記錄完整
- 回滾:保留舊容器與舊 DB 一週,nginx 切回即可

### 階段 A(可選,之後再評):QTStation UI 重寫成 React
- 9 個 entity、儀表板圖表(Chart.js)、Word 匯入(mammoth)、爬蟲配置頁——按 wowcrm 的 view 慣例逐頁重做
- 不建議與 B 同時做;先讓 B 穩定一個月

## 五、不動的東西
- 爬蟲(`workbench/crawler/*.py`)是本地跑的 Python,與合併無關,照舊
- QTStation `AUDIT.md` 提到的 cookie 明文風險是爬蟲配置頁的問題,合併不會使其變好或變壞;維持「真 cookie 只放伺服器端 cookies.json」的建議
- 部署 workflow 各自維持到 B-1 完成;合流後採 QT 的 `paths-ignore` 寫法(改 docs 不觸發部署)
