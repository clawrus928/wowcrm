# WOW CRM API 文件

給 AI Agent / 自動化工具使用的 REST API 參考。

## Base URL

```
https://wowcrm.wowmac.com/api
```

## 認證

### 方式 1：API Key（推薦給 Agent）

在 GitHub Secret 設好 `API_KEY` 後，所有請求帶 header：

```
X-API-Key: <your-api-key>
```

API Key 認證是**管理員模式**：可以讀寫任何人的資料，不受「只有負責人能改」限制。

範例：
```bash
curl -H "X-API-Key: YOUR_KEY" https://wowcrm.wowmac.com/api/leads
```

### 方式 2：JWT（給前端用戶）

```bash
# 登入
TOKEN=$(curl -s -X POST https://wowcrm.wowmac.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"userId":"u1","password":"YOUR_PASSWORD"}' | jq -r '.token')

# 帶 token
curl -H "Authorization: Bearer $TOKEN" https://wowcrm.wowmac.com/api/leads
```

---

## Entity 一覽

| Entity | 路徑 | 說明 |
|---|---|---|
| leads | /api/leads | 線索 |
| customers | /api/customers | 客戶 |
| contacts | /api/contacts | 聯系人 |
| deals | /api/deals | 商機 |
| contracts | /api/contracts | 合同 |
| quotes | /api/quotes | 報價單 |
| channels | /api/channels | 渠道方 |
| suppliers | /api/suppliers | 供應商 |
| pricings | /api/pricings | 收費項目 |

所有 entity 共用相同的 CRUD 端點格式。

---

## 通用 CRUD 端點

以 `leads` 為例，其他 entity 替換路徑即可。

### 列出全部

```
GET /api/leads
```

回應：`200 OK`
```json
[
  {
    "id": "l_abc123",
    "name": "張大富",
    "company": "老闆茶餐廳",
    "phone": "6633-9999",
    "status": "未接觸",
    "source": "官網",
    "owner": "u1",
    "collaborators": [],
    "created": "2026-05-20"
  }
]
```

### 取得單筆

```
GET /api/leads/:id
```

回應：`200 OK` 或 `404 Not found`

### 新增

```
POST /api/leads
Content-Type: application/json

{
  "name": "張大富",
  "company": "老闆茶餐廳",
  "phone": "6633-9999",
  "status": "未接觸",
  "source": "官網",
  "owner": "u1",
  "collaborators": ["u2"]
}
```

- `id` 可選（不填則自動產生）
- `owner` 可選（不填預設為 API 請求者）
- `created` 可選（不填預設為今天）

回應：`200 OK` + 完整 record

### 更新（部分更新）

```
PATCH /api/leads/:id
Content-Type: application/json

{
  "status": "已約訪",
  "phone": "6633-0001"
}
```

只需傳**要改的欄位**，其他不動。

回應：`200 OK` + 更新後的完整 record

### 刪除

```
DELETE /api/leads/:id
```

回應：`200 OK` + `{"ok": true}`

---

## 特殊端點

### 商機階段移動

```
POST /api/deals/:id/stage
Content-Type: application/json

{"stage": "提案中"}
```

任何登入用戶 / API key 都可以移。

### 線索轉客戶

```
POST /api/leads/:id/convert
Content-Type: application/json

{
  "name": "老闆茶餐廳",
  "industry": "餐飲",
  "address": "澳門氹仔",
  "source": "官網"
}
```

body 是新客戶的欄位。原線索的 channelId 會自動帶到客戶。
同時自動建一筆 Contact（從原線索的聯絡人姓名 + 手機）。

回應：
```json
{
  "customer": { "id": "c_xxx", "name": "老闆茶餐廳", ... },
  "contact": { "id": "ct_xxx", "name": "張大富", "phone": "6633-9999", ... }
}
```

### 用戶清單（不需認證）

```
GET /api/auth/users
```

回應：
```json
[
  {"id": "u1", "name": "Alan Leong"},
  {"id": "u2", "name": "Benson 文斌"},
  ...
]
```

### 健康檢查（不需認證）

```
GET /api/health
```

回應：`{"ok": true, "ts": "2026-05-20T12:00:00.000Z"}`

---

## Entity Schema

### Lead 線索

| 欄位 | 類型 | 必填 | 說明 |
|---|---|---|---|
| name | string | ✓ | 聯絡人姓名 |
| company | string | ✓ | 商戶名稱 |
| phone | string | ✓ | 手機 |
| status | string | | 未接觸 / 已約訪 / 無回應 / 流失 / 已轉客戶 |
| source | string | | 官網 / 轉介紹 / 渠道方 / 電話開發 / 展覽 / 社群媒體 / 廣告 / 其他 |
| channelId | string | | 渠道方 ID（source=渠道方 時用） |
| owner | string | | 負責人 user ID（如 u1） |
| collaborators | string[] | | 協作人 user ID 列表 |

### Customer 客戶

| 欄位 | 類型 | 必填 | 說明 |
|---|---|---|---|
| name | string | ✓ | 商戶名稱 |
| corpGroup | string | | 集團名稱 |
| industry | string | | 科技 / 金融 / 零售 / 製造 / 餐飲 / 醫療 / 教育 / 貿易 / 其他 |
| address | string | | 地址 |
| source | string | | 客戶來源 |
| channelId | string | | 渠道方 ID |
| owner | string | | 負責人 |
| collaborators | string[] | | 協作人 |

### Contact 聯系人

| 欄位 | 類型 | 必填 | 說明 |
|---|---|---|---|
| customerId | string | ✓ | 所屬客戶 ID |
| name | string | ✓ | 姓名 |
| role | string | | 職位 |
| phone | string | | 座機 |
| email | string | | Email |
| owner | string | | 負責人 |

### Deal 商機

| 欄位 | 類型 | 必填 | 說明 |
|---|---|---|---|
| title | string | ✓ | 商機名稱 |
| customerId | string | ✓ | 關聯客戶 ID |
| product | string | ✓ | 產品線：consulting / hardware / marketing |
| stage | string | ✓ | 階段（依產品線不同） |
| amount | number | | 預估金額（可選，空白時自動取已接受報價合計） |
| status | string | | 進行中 / 已成交 / 已流失 |
| supplierId | string | | 供應商 ID |
| owner | string | | 負責人 |
| collaborators | string[] | | 協作人 |

產品線階段：
- consulting：需求分析 / 提案中 / 執行中 / 驗收中 / 已完成
- hardware：報價中 / 採購中 / 出貨中 / 安裝中 / 已交付
- marketing：需求確認 / 策略規劃 / 執行中 / 成效追蹤 / 已結案

### Quote 報價單

| 欄位 | 類型 | 必填 | 說明 |
|---|---|---|---|
| title | string | ✓ | 報價單名稱 |
| customerId | string | ✓ | 關聯客戶 ID |
| dealId | string | | 關聯商機 ID |
| currency | string | | MOP / HKD / RMB（預設 MOP） |
| items | array | ✓ | 收費項目列表（見下方 LineItem） |
| addOns | array | | 套餐優惠 / 加值費列表（見下方 AddOn） |
| status | string | | 草稿 / 已發送 / 已接受 / 已拒絕 / 已過期 |
| validUntil | string | | 有效期限（YYYY-MM-DD） |
| owner | string | | 負責人 |
| collaborators | string[] | | 協作人 |

### Contract 合同

| 欄位 | 類型 | 必填 | 說明 |
|---|---|---|---|
| title | string | ✓ | 合同名稱 |
| customerId | string | ✓ | 關聯客戶 ID |
| dealId | string | | 關聯商機 ID |
| currency | string | | MOP / HKD / RMB |
| items | array | ✓ | 收費項目列表 |
| addOns | array | | 套餐優惠 / 加值費 |
| status | string | | 草稿 / 審批中 / 已簽署 / 執行中 / 已完成 / 已終止 |
| signDate | string | | 簽約日期 |
| startDate | string | | 開始日期 |
| endDate | string | | 到期日期 |
| internalCommissionAmount | number | | 內部佣金金額 |
| internalNotes | string | | 內部備註 |
| owner | string | | 負責人 |
| collaborators | string[] | | 協作人 |

### LineItem（嵌在 Quote / Contract 的 items 陣列裡）

```json
{
  "id": "li_xxx",
  "pricingId": "pr_xxx",
  "name": "高德-A商戶通 (餐飲/零售)",
  "quantity": 1,
  "unitPrice": 12000,
  "cost": 3000,
  "discountPct": 20,
  "billingType": "年付",
  "description": "商戶入駐:支持密碼/郵箱...\n開通團購:協助設置..."
}
```

小計 = quantity × unitPrice × (1 - discountPct/100)

### AddOn（嵌在 Quote / Contract 的 addOns 陣列裡）

```json
{
  "id": "ao_xxx",
  "name": "組合購折扣",
  "kind": "discount",
  "amount": 20
}
```

- kind=`discount`：amount 是 %，套用在 items 小計之後
- kind=`fee`：amount 是 MOP 絕對值，加進「總承諾」

### Channel 渠道方

| 欄位 | 類型 | 必填 | 說明 |
|---|---|---|---|
| name | string | ✓ | 渠道名稱 |
| type | string | | 二級代理 / 外判銷售 / 推薦人 / 其他 |
| contact | string | | 聯絡人 |
| phone | string | | 電話 |
| email | string | | Email |
| status | string | | 啟用 / 停用 |
| notes | string | | 備註 |
| owner | string | | 對接人 |

### Supplier 供應商

| 欄位 | 類型 | 必填 | 說明 |
|---|---|---|---|
| name | string | ✓ | 供應商名稱 |
| type | string | | 顧問合作方 / 硬體供應商 / 行銷合作方 / 物流商 / 安裝商 / 其他 |
| contact | string | | 聯絡人 |
| phone | string | | 電話 |
| email | string | | Email |
| paymentTerms | string | | 付款條件 |
| status | string | | 啟用 / 停用 |
| notes | string | | 備註 |
| owner | string | | 對接人 |

### Pricing 收費項目

| 欄位 | 類型 | 必填 | 說明 |
|---|---|---|---|
| name | string | ✓ | 項目名稱 |
| category | string | | 顧問服務 / 硬體設備 / 行銷服務 / 其他 |
| currency | string | | MOP / HKD / RMB |
| price | number | ✓ | 預設售價 |
| cost | number | | 成本（內部） |
| billingType | string | | 一次性 / 月付 / 季付 / 年付 |
| tiers | array | | 階梯折扣表 `[{minQty, discountPct}]` |
| description | string | | 說明 |
| status | string | | 啟用 / 停用 |
| owner | string | | 建立者 |

---

## 錯誤碼

| HTTP | 說明 |
|---|---|
| 400 | 請求格式錯誤 |
| 401 | 未認證（token 過期 / API key 錯誤） |
| 403 | 權限不足（只有負責人能改刪，API key 不受此限） |
| 404 | 找不到 |

錯誤回應格式：
```json
{"error": "只有負責人可以修改"}
```

---

## Agent 典型工作流範例

### 1. 建線索 + 轉客戶 + 開商機

```bash
API="https://wowcrm.wowmac.com/api"
KEY="YOUR_API_KEY"
H="-H X-API-Key:$KEY -H Content-Type:application/json"

# 建線索
LEAD=$(curl -s -X POST $API/leads $H -d '{
  "name": "陳小明",
  "company": "新街美食",
  "phone": "6633-1234",
  "source": "展覽",
  "owner": "u4"
}')
LEAD_ID=$(echo $LEAD | jq -r '.id')

# 轉客戶
CONVERT=$(curl -s -X POST $API/leads/$LEAD_ID/convert $H -d '{
  "name": "新街美食",
  "industry": "餐飲",
  "address": "澳門新馬路"
}')
CUST_ID=$(echo $CONVERT | jq -r '.customer.id')

# 開商機
curl -s -X POST $API/deals $H -d "{
  \"title\": \"新街美食 - 商戶通\",
  \"customerId\": \"$CUST_ID\",
  \"product\": \"marketing\",
  \"stage\": \"需求確認\",
  \"status\": \"進行中\",
  \"owner\": \"u4\"
}"
```

### 2. 建報價單（帶 line items + 折扣 + 加值費）

```bash
curl -s -X POST $API/quotes $H -d '{
  "title": "新街美食 - AMap 報價",
  "customerId": "c_xxx",
  "dealId": "d_xxx",
  "currency": "RMB",
  "items": [
    {
      "name": "高德商戶通 (餐飲)",
      "quantity": 3,
      "unitPrice": 8400,
      "cost": 3000,
      "discountPct": 10,
      "billingType": "年付",
      "description": "3 門店年費\n含商戶入駐 / 團購 / 內容管理"
    }
  ],
  "addOns": [
    {"name": "組合購折扣", "kind": "discount", "amount": 20},
    {"name": "廣告充值", "kind": "fee", "amount": 15000}
  ],
  "status": "草稿",
  "owner": "u4"
}'
```

### 3. 批次匯入客戶

```bash
for row in "${customers[@]}"; do
  curl -s -X POST $API/customers $H -d "$row"
done
```

---

## 設定 API Key

1. 產生一個隨機 key：`openssl rand -base64 32`
2. GitHub → Settings → Secrets → 新增 `API_KEY`
3. 重新 deploy（push 任何 commit 或手動 workflow）
4. Agent 開始用

---

## 注意事項

- API Key 擁有**完全管理員權限**（讀寫所有 entity、跳過 owner check）
- 不要把 API Key 存在前端 / 公開的地方
- 每個請求回應都是 JSON
- 日期格式：`YYYY-MM-DD`
- ID 可自訂或自動產生
- `items` 和 `addOns` 在 `POST / PATCH` 時會完整替換（不是 merge）
