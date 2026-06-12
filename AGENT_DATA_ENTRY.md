# 讓 AI Agent 代你入資料 — 操作指引

把這份文件（或下方的「貼給 Agent 的提示詞」）丟給任何 AI（ChatGPT / Claude / n8n / 自寫腳本），
它就能透過 REST API 幫你把資料批次寫進 WOW CRM，不用你手動一筆筆打。

---

## 0. 一次性前提：設好 API Key

Agent 入資料走 **API Key 認證**（管理員模式，可寫任何人的資料）。第一次要先設定：

1. 產生 key：`openssl rand -base64 32`
2. GitHub → repo `clawrus928/wowcrm` → Settings → Secrets and variables → Actions → 新增 secret `API_KEY`
3. 隨便 push 一個 commit（或手動跑 deploy workflow）讓它生效
4. 把這個 key 交給你信任的 Agent（**不要貼在前端或公開地方**）

驗證 key 可用：

```bash
curl -H "X-API-Key: 你的KEY" https://wowcrm.wowmac.com/api/leads
# 回 [] 或一串 JSON = 成功；回 401 = key 沒設好或不對
```

---

## 1. 貼給 Agent 的提示詞（複製這整段）

> 你是我的 WOW CRM 資料錄入助手。請把我接下來提供的資料，透過 REST API 寫進系統。
>
> **連線方式**
> - Base URL：`https://wowcrm.wowmac.com/api`
> - 每個請求都帶 header：`X-API-Key: <我給你的KEY>` 和 `Content-Type: application/json`
>
> **批次寫入（優先用這個）**
> - 端點：`POST /api/{entity}/bulk`，body：`{"items": [ {...}, {...} ]}`
> - 單次最多 500 筆；整批是原子交易，任何一筆失敗會全部回滾
> - entity 可填：`leads`(線索) / `customers`(客戶) / `contacts`(聯系人) / `deals`(商機) /
>   `quotes`(報價單) / `contracts`(合同) / `channels`(渠道方) / `suppliers`(供應商) / `pricings`(收費項目)
>
> **欄位規則**
> - `owner` 填負責業務的 user ID（見下方對照表）；不填會掛在 "api" 名下（前端用戶就改不動），所以**盡量填**
> - `id` / `created` 不用填，系統自動產生
> - 各 entity 的必填欄位與列舉值見下方「欄位速查」，列舉值要用**繁體中文原文**，不要自己翻譯
> - 關聯欄位（如 `customerId`、`dealId`、`channelId`）要填對應 record 的 `id`
>
> **流程**
> 1. 先把我給的原始資料（CSV / 文字 / 表格）整理成 JSON 陣列
> 2. 有關聯時，先建上游 entity（客戶）拿到回傳的 `id`，再用該 id 建下游（商機 / 報價）
> 3. 用 `bulk` 端點送出，回報每批的 `count` 和有沒有錯誤
> 4. 如果某批回 400，把錯誤訊息貼給我，**不要**改成逐筆硬塞
>
> 開始前先跟我確認：要寫進哪個 entity、`owner` 給誰。

---

## 2. 負責人（owner）user ID 對照表

| ID | 業務 | ID | 業務 |
|---|---|---|---|
| u1 | Alan Leong | u7 | Maggie Chim |
| u2 | Benson 文斌 | u8 | Kennedy |
| u3 | 陈伏娟 | u9 | 杨家欣 |
| u4 | Cyrus | u10 | 藍光 |
| u5 | Eason | u11 | 李蔭良 |
| u6 | Tata | | |

---

## 3. 欄位速查（必填 ✓，列舉值用繁中原文）

| Entity | 必填 | 常用可選 | 列舉值 |
|---|---|---|---|
| **leads** 線索 | name, company, phone | source, owner, channelId | source：官網 / 轉介紹 / 渠道方 / 電話開發 / 展覽 / 社群媒體 / 廣告 / 其他 |
| **customers** 客戶 | name | industry, address, source, owner, channelId, corpGroup | industry：科技 / 金融 / 零售 / 製造 / 餐飲 / 醫療 / 教育 / 貿易 / 其他 |
| **contacts** 聯系人 | customerId, name | role, phone, email, owner | — |
| **deals** 商機 | title, customerId, product, stage | amount, status, supplierId, owner | product：consulting / hardware / marketing；status：進行中 / 已成交 / 已流失（stage 見下） |
| **quotes** 報價單 | title, customerId, items | dealId, currency, status, validUntil, owner | status：草稿 / 已發送 / 已接受 / 已拒絕 / 已過期 |
| **contracts** 合同 | title, customerId, items | dealId, status, signDate, internalCommissionAmount, owner | status：草稿 / 審批中 / 已簽署 / 執行中 / 已完成 / 已終止 |
| **channels** 渠道方 | name | type, contact, phone, email, status, owner | type：二級代理 / 外判銷售 / 推薦人 / 其他 |
| **suppliers** 供應商 | name | type, contact, phone, paymentTerms, status, owner | type：顧問合作方 / 硬體供應商 / 行銷合作方 / 物流商 / 安裝商 / 其他 |
| **pricings** 收費項目 | name, price | category, currency, cost, billingType, tiers | category：顧問服務 / 硬體設備 / 行銷服務 / 其他 |

**deal stage（依產品線）**
- consulting：需求分析 / 提案中 / 執行中 / 驗收中 / 已完成
- hardware：報價中 / 採購中 / 出貨中 / 安裝中 / 已交付
- marketing：需求確認 / 策略規劃 / 執行中 / 成效追蹤 / 已結案

貨幣：MOP（預設）/ HKD / RMB。`quotes` / `contracts` 的 `items` / `addOns` 結構見 `API_DOC.md`。

---

## 4. 完整範例：把一份客戶名單批次入庫

假設你有這份 CSV：

```
商戶名稱,行業,地址,負責人
新街美食,餐飲,澳門新馬路,u4
鴻運電器,零售,澳門高士德,u5
康健藥房,醫療,澳門黑沙環,u1
```

Agent 整理成 bulk 請求：

```bash
API="https://wowcrm.wowmac.com/api"
H="-H X-API-Key:你的KEY -H Content-Type:application/json"

curl -s -X POST $API/customers/bulk $H -d '{
  "items": [
    {"name": "新街美食", "industry": "餐飲", "address": "澳門新馬路",   "owner": "u4"},
    {"name": "鴻運電器", "industry": "零售", "address": "澳門高士德",   "owner": "u5"},
    {"name": "康健藥房", "industry": "醫療", "address": "澳門黑沙環",   "owner": "u1"}
  ]
}'
# → {"count": 3, "created": [ {"id":"c_...", ...}, ... ]}
```

要接著幫某個客戶建商機，就用回傳的 `customerId`：

```bash
curl -s -X POST $API/deals/bulk $H -d '{
  "items": [
    {"title": "新街美食 - 商戶通", "customerId": "c_xxx", "product": "marketing",
     "stage": "需求確認", "status": "進行中", "owner": "u4"}
  ]
}'
```

---

## 5. 注意事項

- API Key 是**完全管理員權限**，只給信任的 Agent；外洩請立刻在 GitHub 換掉 `API_KEY` 並重新 deploy。
- `bulk` 是原子交易：回 400 代表整批都沒寫入，修正後重送即可，不會產生重複。
- 大量資料分批送，每批 ≤ 500 筆。
- 列舉值（狀態、來源、類型…）一定用上表的繁中原文，打錯字雖然 API 不擋，但前端篩選會對不上。
- 想讓 Agent 改既有資料：`PATCH /api/{entity}/{id}`；刪除：`DELETE /api/{entity}/{id}`（詳見 `API_DOC.md`）。
