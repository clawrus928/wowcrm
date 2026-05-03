# WOW CRM 專案總覽

匯入用文件。整理目前專案的全部背景、架構、決策、慣例，給 agent / 隊友 / 未來的你快速理解狀態。

---

## 1. 專案是什麼

多產品 Pipeline CRM，給澳門團隊（11 位業務）內部使用。一級代理場景：
- **線索 → 客戶 → 商機 → 報價 / 合同**
- 接二級代理 / 外判銷售 / 推薦人作為「**渠道方**」帶單
- 接 顧問 / 硬體 / 行銷 等外部「**供應商**」執行商機
- 三條獨立產品線（顧問 / 硬體 / 行銷），各有自己的 pipeline 階段

---

## 2. 線上環境

- **URL**：https://wowcrm.wowmac.com
- **登入**：選帳號（11 個業務）+ 密碼（GitHub Secret `DEFAULT_PASSWORD`）
- **HTTPS**：Let's Encrypt（certbot 自動續約）
- **右下角顯示 git SHA**，用來驗證部署是否到位

---

## 3. 技術棧

### 前端
- React 18 + Vite 5
- 純 inline style（沒用 CSS framework，design tokens 在 `src/theme.js`）
- 字體：Noto Sans TC + DM Mono
- 沒用 router（單頁 state-based view 切換）

### 後端
- Node 20 + Fastify 4
- `better-sqlite3`（同步 API、檔案型）
- `@fastify/jwt` JWT 簽發
- `bcryptjs` 密碼雜湊
- `@fastify/static` 同 server 服務前端 dist

### 資料庫
- **SQLite**，檔案在 EC2 host 的 `/var/lib/wowcrm/wowcrm.db`
- Schema 極簡：`users` 表 + `records` 表（generic JSON storage，所有 entity 共用）
- 11–15 人 / 預期 ~1000 客戶 / 年 → 5 年 50k 紀錄上限，SQLite 完全勝任

### 部署
- Docker（multi-stage：build frontend → install backend deps → runtime image）
- Image 推到 `ghcr.io/clawrus928/wowcrm`
- 靠 GitHub Actions 推到 EC2（SSH + docker compose pull）
- nginx 在 EC2 反向代理 + HTTPS（與另一個專案 `ledger` 共用同台）

---

## 4. 部署架構

```
            INTERNET
               │
               ▼
        ┌──────────────┐
        │ EC2 t3.medium │  Ubuntu, Public IP 13.236.95.177
        │   13.236.95.x │
        └──────┬────────┘
               │ port 80 / 443 (對外開)
               ▼
        ┌──────────────┐
        │     nginx     │  /etc/nginx/conf.d/{ledger,wowcrm}.conf
        └──┬────────────┘
           │
           ├──── ledger.wowmac.com  ──→  127.0.0.1:8000  (systemd + venv)
           │
           └──── wowcrm.wowmac.com  ──→  127.0.0.1:8002  (Docker 容器)
                                              │
                                              ▼
                                     /var/lib/wowcrm/wowcrm.db
                                     （volume mount，永遠不被 deploy 動到）
```

### Port 配給表

| Port | App | Subdomain |
|---|---|---|
| 8000 | ledger | ledger.wowmac.com |
| 8001 | _空_ | — |
| **8002** | **wowcrm** | **wowcrm.wowmac.com** |

新加 project 時 +1。

### 部署流程

```
push to master  →  GitHub Action
                      │
                      ├─ build Docker image
                      ├─ push to ghcr.io
                      └─ SSH to EC2
                            │
                            ├─ 寫 /opt/wowcrm/docker-compose.yml + .env
                            ├─ docker compose pull
                            ├─ docker compose up -d --remove-orphans
                            └─ 健康檢查 curl 127.0.0.1:8002/api/health
```

每次 deploy 約 3–5 分鐘。資料保存在 host volume，container 換掉不影響。

---

## 5. 資料模型（8 個 entity）

```
渠道方 (Channel) ──帶來──┐
                         ▼
                       線索 (Lead) ──轉客戶──→ 客戶 (Customer) ──┬──→ 聯系人 (Contact)
                                                                ├──→ 商機 (Deal) ──→ Pipeline 看板
                                                                ├──→ 合同 (Contract) ←─內部佣金←─
                                                                └──→ 報價單 (Quote)
                                                                       ▲
供應商 (Supplier) ←──── 商機指派執行 ─────────────────────────────────┘
```

### 各 entity 主要欄位

| Entity | 主要欄位 |
|---|---|
| **Lead 線索** | name, company, phone, status, source, channelId, owner, collaborators, convertedCustomerId |
| **Customer 客戶** | name, corpGroup, industry, address, status, source, channelId, owner, collaborators |
| **Contact 聯系人** | customerId, name, role, phone, email, owner |
| **Deal 商機** | title, customerId, product, stage, amount, status, supplierId, owner, collaborators |
| **Contract 合同** | title, customerId, dealId, amount, status, signDate/startDate/endDate, **internalCommissionAmount**, internalNotes, owner |
| **Quote 報價單** | title, customerId, dealId, amount, status, validUntil, owner |
| **Channel 渠道方** | name, type, contact, phone, email, status, notes, owner |
| **Supplier 供應商** | name, type, contact, phone, email, paymentTerms, status, notes, owner |

### 重要關聯

- **線索 → 客戶轉換**：自動帶 `channelId` 過去（一鍵生成新客戶）
- **內部佣金**：放在合同（不是渠道方），因為每個項目佣金不一樣。渠道方詳情 / 儀表板自動把該渠道相關客戶的合同 commission 累加。
- **Pipeline 看板**：`商機.status === "進行中"` 的 deal 才會出現，按產品線 → 階段排
- **供應商連到商機**：商機表單可選一個供應商，看板卡片會顯示 ⚒ 供應商名稱
- **Contract / Quote 的 dealId 是可選**

### 業務狀態列舉

| 欄位 | 值 |
|---|---|
| 線索狀態 | 未接觸 / 已約訪 / 無回應 / 流失 / 已轉客戶 |
| 客戶狀態 | 未處理 / 初訪 / 跟進中 / 報價 |
| 商機狀態 | 進行中 / 已成交 / 已流失 |
| 合同狀態 | 草稿 / 審批中 / 已簽署 / 執行中 / 已完成 / 已終止 |
| 報價單狀態 | 草稿 / 已發送 / 已接受 / 已拒絕 / 已過期 |
| 線索來源 | 官網 / 轉介紹 / **渠道方** / 電話開發 / 展覽 / 社群媒體 / 廣告 / 其他 |
| 渠道方類型 | 二級代理 / 外判銷售 / 推薦人 / 其他 |
| 供應商類型 | 顧問合作方 / 硬體供應商 / 行銷合作方 / 物流商 / 安裝商 / 其他 |

### 三條產品線

| ID | 名稱 | 顏色 | 階段 |
|---|---|---|---|
| consulting | 顧問服務 | #2563EB（藍）| 需求分析 → 提案中 → 執行中 → 驗收中 → 已完成 |
| hardware | 硬體設備 | #059669（綠）| 報價中 → 採購中 → 出貨中 → 安裝中 → 已交付 |
| marketing | 行銷服務 | #D97706（琥珀）| 需求確認 → 策略規劃 → 執行中 → 成效追蹤 → 已結案 |

---

## 6. 認證 + 權限

### 11 位業務（hardcoded 在 `src/constants.js`）

```
u1  Alan Leong（current user, demo 用）
u2  Benson 文斌
u3  陈伏娟
u4  Cyrus
u5  Eason
u6  Tata
u7  Maggie Chim
u8  Kennedy
u9  杨家欣
u10 藍光
u11 李蔭良
```

- 後端啟動時把 11 人 seed 進 `users` 表，密碼用 `DEFAULT_PASSWORD` 環境變數 bcrypt 雜湊
- 登入透過 JWT，token 存 localStorage，30 天到期

### 權限模型 — B（半開）

- 任何登入用戶**讀全部**
- **只有負責人**（`owner === currentUser`）能 PATCH / DELETE
- 商機階段移動是例外（任何登入用戶都能拖）

---

## 7. 重要 UI 模式

- **Drawer**：右側抽屜（手機全屏）。所有 detail / create / edit 都用同一個 Drawer 元件
- **OwnerTabs**：每個列表頁都有「全部 / 我負責的 / 我協作的」切換
- **跨模組跳轉**：客戶詳情 → 點商機 → 跳到商機詳情；渠道方詳情 → 點客戶 → 跳到客戶詳情。靠 `drawerSeed` prop 在 App.jsx 實作
- **儀表板**：產品線 pipeline、業務排行、商機階段分佈、渠道方表現、供應商表現
- **手機版**：底部 5 格導航 + 「更多」彈出層、漢堡側邊欄、Drawer 全屏
- **登入畫面**：選帳號 + 密碼 + 一鍵填入示範密碼按鈕
- **底部右下角**：版本標示 `v 7-char-sha · build-time`

---

## 8. 一些設計決定

| 決定 | 為什麼 |
|---|---|
| 用 SQLite 而非 Postgres | 11–15 人 / 50k 筆紀錄根本不需要 Postgres；零維運（檔案 cp 就是備份） |
| 內部佣金放合同不放渠道方 | 不同項目佣金不同，固定 % 不彈性 |
| 移除「重置資料」按鈕 | 太危險，誤觸即清空，改用 storage key 升版做一次性 wipe |
| Lead status 簡化成 5 個 | 「初訪 / 跟進中 / 報價」太細，業務分不清 |
| Container 同時服務前端 + API | 一個 image 部署、零靜態檔分發步驟。和 ledger 拆 `/var/www/` 的做法不同但對 Docker 來說更乾淨 |
| 用 generic `records` 表 | 8 個 entity 共用一張表存 JSON，schema 改變不用 migration |
| 採用 EC2 共用 nginx pattern | 沿用 ledger 已建好的 nginx + certbot 流程，新 project 只加一個 `.conf` |

---

## 9. Repo 結構

```
.
├── src/                       前端
│   ├── App.jsx                 主路由 + view 切換
│   ├── main.jsx                Vite entry
│   ├── theme.js                design tokens
│   ├── styles.js               共用 style helpers
│   ├── constants.js            REPS、PRODUCTS、status 列表
│   ├── utils.js                fmt(), getRep(), getCustomer(), useIsMobile()
│   ├── data/
│   │   ├── api.js              fetch wrapper + ApiError
│   │   ├── store.js            useCrmStore hook（接 API，async CRUD）
│   │   └── storage.js          localStorage helpers（auth token）
│   ├── components/
│   │   ├── Drawer.jsx          側邊抽屜
│   │   ├── DataTable.jsx       列表表格
│   │   ├── Tabs.jsx            OwnerTabs
│   │   ├── Badge.jsx           StatusBadge
│   │   ├── DetailRow.jsx       詳情頁的標籤對
│   │   ├── fields.jsx          表單欄位元件
│   │   └── VersionFooter.jsx   右下角 git SHA
│   └── views/
│       ├── Login.jsx
│       ├── Dashboard.jsx
│       ├── Sidebar.jsx + MobileBottomNav.jsx
│       ├── Pipeline.jsx
│       └── {Leads,Customers,Contacts,Deals,Contracts,Quotes,Channels,Suppliers}.jsx
│
├── server/                    後端
│   ├── package.json
│   └── src/
│       ├── index.js            Fastify routes
│       └── db.js               schema + 通用 CRUD
│
├── nginx/
│   └── wowcrm.conf            放到 EC2 的 /etc/nginx/conf.d/ 的範本
│
├── .github/workflows/
│   └── deploy.yml             build image → ghcr → SSH 部署
│
├── Dockerfile                 multi-stage build
├── docker-compose.yml         本地參考用（EC2 上由 workflow 寫入）
├── DEPLOY.md                  EC2 一次性設定
├── DEPLOY_AGENT.md            給 agent 的部署任務書
├── SUBDOMAIN_SETUP.md         接 nginx + certbot 的步驟
├── AGENT_DEBUG_HTTPS.md       HTTPS 連不上時的除錯任務書
└── crm-spec.md                最初的需求規格
```

---

## 10. 環境變數 / Secrets

### GitHub Secrets（5 個）

| 名稱 | 用途 |
|---|---|
| `EC2_HOST` | EC2 公開 IP |
| `EC2_USER` | SSH 用戶（`ubuntu`） |
| `EC2_SSH_KEY` | 私鑰 PEM |
| `JWT_SECRET` | JWT 簽章用，`openssl rand -base64 32` 產生 |
| `DEFAULT_PASSWORD` | 11 業務的初始密碼 |

### 後端環境變數（在 docker-compose / .env）

| 名稱 | 預設 |
|---|---|
| `PORT` | 8080（container 內） |
| `HOST` | 0.0.0.0 |
| `DB_PATH` | /data/wowcrm.db |
| `JWT_SECRET` | dev-secret-change-me |
| `DEFAULT_PASSWORD` | wowcrm |
| `STATIC_DIR` | /srv/dist |

---

## 11. 已完成功能

- [x] 8 個 entity 的列表 / 篩選 / 搜尋 / Tabs
- [x] 8 個 entity 的 CRUD（新增 / 編輯 / 刪除 + 詳情側面板）
- [x] 線索 → 客戶轉換（一鍵，自動帶渠道方）
- [x] 商機 / 客戶 / 渠道方 / 供應商之間的跨跳轉
- [x] Pipeline 看板（拖曳 / 手機按鈕、按產品線切換、供應商標籤）
- [x] 儀表板（產品線、業務、階段分佈、渠道方、供應商）
- [x] 11 人帳號 + 登入 + JWT + 自動續登
- [x] 響應式（桌面 + 手機）
- [x] 版本標示
- [x] EC2 + nginx + HTTPS 部署
- [x] CI/CD（push master → 自動 deploy）

---

## 12. 還沒做（建議優先順序）

1. **報價單 / 合同 PDF 列印** — 客戶要看的正式文件
2. **報價接受 → 商機自動推進階段**（目前是手動）
3. **合同簽署 → 商機自動標已成交**
4. **客戶詳情加 + 新增商機 / 報價 / 合同 按鈕**（目前要去對應列表頁建）
5. **每人改自己的密碼 UI**（目前 11 人共用 `DEFAULT_PASSWORD`）
6. **匯入 / 匯出 CSV**
7. **活動紀錄 audit log**（誰在什麼時候改了什麼）
8. **備份排程**（cron + S3）
9. **toast 取代 `alert()`**

---

## 13. 常用 Git / Deploy 流程

```bash
# 開發新功能
git checkout -b feat/xxx
# ...改檔...
npm run build              # 驗證前端
cd server && npm install   # 第一次需要
node src/index.js          # 本地後端

# 提交
git push -u origin feat/xxx
# 在 GitHub UI 開 PR → 合併到 master

# 自動部署
# 監控：https://github.com/clawrus928/wowcrm/actions
# 部署完打開 https://wowcrm.wowmac.com 看右下角 SHA 對不對
```

### 本地跑後端（不接 EC2）

```bash
cd server
npm install
DB_PATH=/tmp/wowcrm-dev.db PORT=8080 node src/index.js
# 另一個 terminal
npm run dev    # 前端 vite dev server，預設打 same-origin /api
```

---

## 14. 常用 EC2 操作

```bash
ssh ubuntu@13.236.95.177

# 看 container 狀態
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'

# 看 wowcrm logs
docker logs wowcrm --tail=100 -f

# 手動重啟
cd /opt/wowcrm && docker compose restart

# 備份 DB
sudo cp /var/lib/wowcrm/wowcrm.db ~/wowcrm.backup.$(date +%F).db

# 看 nginx
sudo systemctl status nginx
sudo nginx -T 2>/dev/null | grep -A 20 "wowcrm.wowmac.com"
sudo tail -50 /var/log/nginx/error.log
```

---

## 15. 已知陷阱

- **storage key 升版會清前端 localStorage**：目前是 `wowcrm:v2`，要再升 → 用戶 token 會被踢，要重新登入
- **container 必須 bind `127.0.0.1:8002` 不是 `0.0.0.0:3002`**：不然會繞過 nginx + 沒 HTTPS
- **GitHub Action 的 heredoc 會覆蓋 EC2 上的 docker-compose.yml**：每次 deploy 都重寫，不要直接在 EC2 改這檔（改 repo 後重新 deploy）
- **certbot 改 nginx conf 後，repo 裡的 `nginx/wowcrm.conf` 會跟 EC2 不同步**：以 EC2 上的為準（包含 443 server block + ssl_certificate 路徑）
- **資料 owner = null 的 record**：理論上不該發生，但若有舊資料，任何人都能改（沒 owner → 跳過權限檢查）
- **Pipeline drag 在 Safari 行動版**：HTML5 native drag 不太順，所以有保留 prev/next 按鈕

---

## 16. 已合併 PR 摘要

| # | 標題 |
|---|---|
| 1 | Phase 2: Vite scaffold + CRUD + Dashboard + Pages deploy |
| 2 | Use MOP currency instead of NT$ |
| 3 | Simplify lead status to 4 stages + 已轉客戶 |
| 4 | Add 渠道方 (Channel) module with lead/customer linkage and analytics |
| 5 | Replace placeholder reps with real team (11 members) |
| 6 | Add login screen with rep selection (demo password: wowcrm) |
| 7 | Add 供應商 (Supplier) module with deal linkage and pipeline visibility |
| 8 | Clear all seed data (start with empty CRM) |
| 9 | Remove reset button; move channel commission into contracts as internal field |
| 10 | EC2 deploy: backend (Fastify + SQLite + JWT) + Docker + CI |
| 11 | Fix: align port 3002 in workflow + restore working API client |
| 12 | Show app version (git SHA + build time) at the bottom of the screen |
| 13 | Move wowcrm behind nginx on crm.wowmac.com (port 127.0.0.1:8002) |
| 14 | Use wowcrm.wowmac.com (not crm.wowmac.com) |
| 15 | Add AGENT_DEBUG_HTTPS.md for diagnosing 連線問題 |
