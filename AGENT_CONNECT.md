# WOW CRM — Agent 連線指引

這份文件給 AI Agent / 自動化工具看,說明**如何連上 WOW CRM 系統**並開始讀寫資料。

---

## 1. 連線資訊

| 項目 | 值 |
|---|---|
| Base URL | `https://wowcrm.wowmac.com/api` |
| 認證方式 | API Key(放在 HTTP header) |
| Header | `X-API-Key: <你的 API_KEY>` |
| 內容格式 | `Content-Type: application/json`(JSON 進、JSON 出) |
| 日期格式 | `YYYY-MM-DD` |

> **API Key = 管理員權限**:可讀寫所有人的資料,不受「只有負責人能改」限制。
> 只交給信任的 Agent,**不要**放在前端或公開位置。

---

## 2. 三步驟連上系統

### Step 1 — 拿到 API Key

由系統管理員在 GitHub 設定 `API_KEY` Secret(`openssl rand -base64 32` 產生),
重新 deploy 後生效,再把 key 交給 Agent。

### Step 2 — 測試連線(handshake)

先打不需認證的健康檢查,確認系統活著:

```bash
curl -s https://wowcrm.wowmac.com/api/health
# 預期:{"ok":true,"ts":"..."}
```

### Step 3 — 驗證 API Key

帶 key 讀一個 entity,確認認證成功:

```bash
curl -s -H "X-API-Key: 你的KEY" https://wowcrm.wowmac.com/api/leads
```

| 回應 | 意思 |
|---|---|
| `[]` 或一串 JSON 陣列 | ✅ 連線 + 認證成功,可以開始 |
| `401 {"error":"Unauthorized"}` | ❌ key 沒設好 / 不對 / 尚未 deploy |

連到這裡就代表 Agent 已成功接上系統。

---

## 3. 可用的 Entity

所有 entity 共用相同的 REST 路徑格式 `/api/{entity}`:

| entity | 中文 | entity | 中文 |
|---|---|---|---|
| `leads` | 線索 | `quotes` | 報價單 |
| `customers` | 客戶 | `contracts` | 合同 |
| `contacts` | 聯系人 | `channels` | 渠道方 |
| `deals` | 商機 | `suppliers` | 供應商 |
| | | `pricings` | 收費項目 |

---

## 4. 可用的操作(端點總覽)

| 操作 | 方法 + 路徑 | 說明 |
|---|---|---|
| 列出全部 | `GET /api/{entity}` | 回陣列 |
| 取單筆 | `GET /api/{entity}/{id}` | 回物件 / 404 |
| 新增一筆 | `POST /api/{entity}` | body 為單一物件 |
| **批次新增** | `POST /api/{entity}/bulk` | body `{"items":[...]}`,單一交易、全成功或全回滾,≤500 筆 ⭐ |
| 更新 | `PATCH /api/{entity}/{id}` | 只傳要改的欄位 |
| 刪除 | `DELETE /api/{entity}/{id}` | 回 `{"ok":true}` |
| 移動商機階段 | `POST /api/deals/{id}/stage` | body `{"stage":"提案中"}` |
| 線索轉客戶 | `POST /api/leads/{id}/convert` | body 為新客戶欄位 |

> 大量入資料一律用 **`/bulk`**:一個請求搞定,且原子式(中途失敗不會留半套)。

---

## 5. 最小可用範例

```bash
API="https://wowcrm.wowmac.com/api"
H="-H X-API-Key:你的KEY -H Content-Type:application/json"

# 連線測試
curl -s $API/health

# 批次建立 2 筆客戶
curl -s -X POST $API/customers/bulk $H -d '{
  "items": [
    {"name": "新街美食", "industry": "餐飲", "owner": "u4"},
    {"name": "鴻運電器", "industry": "零售", "owner": "u5"}
  ]
}'
# → {"count":2,"created":[{"id":"c_...","name":"新街美食",...}, ...]}
```

---

## 6. 錯誤碼

| HTTP | 意思 | 處理 |
|---|---|---|
| 200 | 成功 | — |
| 400 | 請求格式錯 / 批次中有一筆失敗(整批回滾) | 修正 body 後重送 |
| 401 | 未認證(key 錯或沒帶) | 檢查 `X-API-Key` |
| 403 | 權限不足(用 JWT 而非 API key 時才會遇到) | 改用 API key |
| 404 | 找不到該 id | 確認 id |

錯誤格式:`{"error": "說明文字"}`

---

## 7. 延伸文件

- **`AGENT_DATA_ENTRY.md`** — 入資料完整指引(貼用提示詞、owner 對照表、各 entity 欄位與列舉速查、CSV→bulk 範例)
- **`API_DOC.md`** — 完整 REST API 參考(每個欄位、Quote/Contract 的 items/addOns 結構、特殊端點)
