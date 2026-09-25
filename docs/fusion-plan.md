# WowCRM × QTStation 合併計劃(以業務重疊為主軸)

日期:2026-09-25。依據:兩邊原始碼實讀(WowCRM 各 view 的欄位定義;QTStation `workbench/js/app.js` 5741 行的表單/儲存/渲染函式逐一萃取)+ 後端逐項比對 + `qtstation/FUSION.md`。

## 一、結論

兩個系統**同時在記錄同一批業務事實**,只是用不同的欄位與不同的地方:客戶、報價、簽約金額、合約期、服務條數、待辦。QTStation 另有 6 個純內容運營模組(爆款視頻、對標帳號、IP 孵化、B-roll 素材、關鍵詞、每日任務)與 CRM 不重疊。所以合併的正確做法是:**業務事實只記一次(以 WowCRM 為主檔),QTStation 保留它獨有的交付與運營模組並掛在 CRM 的客戶/合同上。** 後端技術一致(schema/認證/API 契約 1:1)只是讓這件事便宜,不是合併的理由。

## 二、業務重疊對映表

| 業務事實 | WowCRM 怎麼記 | QTStation 怎麼記 | 對映判斷 |
|---|---|---|---|
| **客戶身分** | `customers`:name, corpGroup, industry, status(未處理/初訪/跟進中/報價), source, owner, collaborators, channelId;聯絡人另存 `contacts` | `customers`:name, company, phone, wechat, platform;**無 owner、無 source** | 同一實體。以 CRM 為主檔;QT 的 phone/wechat 進 `contacts`;platform 等 QT 專屬欄位另存(見「擴充」) |
| **報價單** | `quotes` 獨立 entity:customerId, dealId, currency(MOP/HKD/RMB), items{name, quantity, unitPrice, cost, discountPct, billingType}, addOns, status(草稿/已發送/已接受/已拒絕/已過期), validUntil, docNo `Q-YYYY-NNN` | `customers[].quotes[]` 內嵌:quoteNumber, currency 固定 'HKD', items{name, unit, unitPrice, quantity}, discount(絕對金額), status(draft/sent/signed), signedDate, paymentTerms | **完全同一件事**。搬進 CRM `quotes`:draft→草稿、sent→已發送、signed→已接受;幣別明寫 HKD;絕對折扣轉為 addOns 折扣;QT 的 unit 進 description |
| **簽約 / 合同** | `contracts` 獨立 entity:quoteId, items, status(草稿/審批中/已簽署/執行中/已完成/已終止), signDate, startDate, endDate, internalCommissionAmount | 沒有合同物件。「signed 的報價」= 簽約;合約期與類型記在客戶身上:contractType, contractStartDate/EndDate, contractTotal = fineCutVideoCount + aiVideoCount, hasDigitalHuman, digitalHumanCount | QT 的 signed 報價 → CRM 建一筆 `contracts`(已簽署),日期取客戶的合約起訖,**「精剪 N 條 / AI N 條 / 數字人 N 個」變成合同的 line items(quantity = 條數)**——這樣「合約條數」不再是客戶欄位,而是合同內容 |
| **收入(客戶端)** | 已接受報價合計 / 已簽署合同,**按幣別分桶**(`sumByCurrency`) | `totalSignedRevenue` = Σ signed 報價的 `Σ(unitPrice×qty) − discount`,全部視為 HKD 直接相加 | 定義一致(簽約金額)。合併後 QT 的數字自然落在 CRM 儀表板的 HKD 桶裡;CRM 的多幣別保護對 QT 資料是升級 |
| **收入(自營 IP)** | 無 | `ips.revenue`(月收入,固定 HKD)+ `ips.updates[].revenue` 歷史 | **不是客戶收入,不能混進簽約金額**。保留為 QT 的 `ips` entity;CRM 儀表板另加一張「自營 IP 月收入」卡,分開顯示 |
| **預付 / 點數** | 無 | `customers[].aiPoints[]{date, type, amount}`,餘額 = Σ amount | 這是客戶的預付款流水,CRM 沒有對應物。抽成獨立 entity `creditLedger{customerId, date, type, amount, description}`,掛 CRM 客戶 id;客戶詳情顯示餘額 |
| **服務價目** | `pricings`:name, price, cost, channelPrice, billingType | 無價目表,報價 items 每次手打 | QT 的服務(精剪視頻、AI 視頻、數字人定制、AI 點數包、投流…)建成 CRM `pricings`,之後報價用 LineItemsEditor 選項目、自動帶價與成本(毛利就出來了,QT 目前算不出毛利) |
| **待辦** | `activities`:kind, date, note, done, relatedType/relatedId(掛商機/客戶/線索);儀表板「待辦跟進」卡 | `tasks`:title, category(crawling/analysis/production/meeting/other), priority, completed, dueDate;**不掛任何客戶** | 語意重疊但 QT 的任務多數是運營工作不對客戶。建議:保留 `tasks`,只在 category=meeting 時允許掛 customerId;不強行併入 activities |
| **交付進度** | 無(商機成交、合同簽署後 CRM 就結束) | `productions{customerId, details[]{title, status: planned→scripting→filming→editing→review→completed, assignee, dueDate}}`,建客戶時自動建一筆 | CRM 缺的環節,是 QT 最有價值的部分。保留 entity,`customerId` 改指 CRM 客戶,**新增 `contractId`** 掛到合同;CRM 合同詳情加「製作進度」區塊(N 條已完成 / 進行中) |
| **客戶帳號成效** | 無 | `customers[].douyinAccount / videoAccount{handle, followers, videoCount, totalLikes}`, accountLastUpdate | QT 專屬,進「擴充」 |
| **銷售階段** | `deals` 有產品線 pipeline(PRODUCTS 各自的 stages)、amount、supplierId | 無售前流程 | 不重疊而是**前後接續**:CRM 商機 → 合同 → QT 製作。QT 客戶建檔時若還沒簽約,應先在 CRM 建商機 |
| 爆款視頻 / 對標帳號 / B-roll / 關鍵詞 / IP 孵化 | 無 | `videos, accounts, brolls, brollKeywords, ips`(彼此無外鍵,獨立工具) | 不重疊,原樣保留在 QT 模組 |

**「擴充」的存法**:QT 專屬的客戶欄位(platform, hasDigitalHuman, digitalHumanCount, preferences, douyinAccount, videoAccount, accountLastUpdate)存成獨立 entity `qtProfiles{customerId, ...}`,不塞進 CRM `customers` JSON——避免兩邊表單互踩,也讓 QT 前端只讀寫自己的那筆。

## 三、合併後的單一業務模型(一句話版)

> 一個客戶(CRM)→ 若干商機(CRM)→ 報價(CRM,含 QT 服務價目)→ 合同(CRM,line items 記錄精剪/AI/數字人條數)→ 製作進度(QT,掛合同)→ 帳號成效與點數餘額(QT 擴充,掛客戶)。收入 = 已簽署合同按幣別加總;自營 IP 收入另計。

QT 的 9 個 entity 合併後的去向:`customers`→併入 CRM 客戶 + `qtProfiles`;`customers[].quotes`→CRM `quotes`/`contracts`;`customers[].aiPoints`→`creditLedger`;`productions`→保留(加 contractId);`tasks`→保留;`ips, accounts, videos, brolls, brollKeywords`→保留;`analyses`→刪除(程式碼中未使用的死 entity)。

## 四、需要你決定的事

1. **兩邊的客戶是不是同一批人?** 若 QT 的客戶多數已在 CRM,搬遷時要做「姓名/電話比對 + 人工確認」的合併清單;若基本不重疊,直接匯入。這決定階段 1 是半天還是兩天。
2. **QT 的簽約要不要真的變成 CRM 合同?** 建議要(這樣「合約條數 / 合約期」有唯一來源,製作進度能掛合同)。代價:QT 前端的報價 Tab 要改讀 CRM API 或直接移除、改在 CRM 開報價。
3. **權限**:CRM entity 維持負責人限定;QT 的 `productions/tasks/ips/...` 維持全員可寫(按 entity 設 policy)。
4. **使用者主檔**:CRM u1–u11 為主,補 role/active;QT 帳號按姓名對映。

## 五、執行計劃(業務優先;每階段可獨立上線)

### 階段 0:定義凍結(半天,只是決定)
四個決定 + 幣別規則:QT 資料全部標 HKD;CRM 儀表板繼續分幣別顯示。

### 階段 1:客戶對齊(0.5–2 天)
- 腳本讀 `qtstation.db` 的 customers,與 CRM customers 用「名稱正規化 + 電話」比對,輸出三類:確定同一、疑似、QT 獨有 → 人工確認疑似
- 確認後:QT 獨有的建為 CRM 客戶(source=「短視頻運營」,owner 由你指定);phone/wechat 建 `contacts`;專屬欄位建 `qtProfiles`;QT 記錄寫入 `crmCustomerId`
- 驗收:每個 QT 客戶都有 crmCustomerId;CRM 客戶數 = 原數 + QT 獨有數;抽 10 筆核對
- 這一步完成後兩邊已可互查,即使後面都不做也有價值

### 階段 2:報價與合同統一(2–3 天)
- 建 `pricings`:精剪視頻、AI 視頻、數字人定制、AI 點數包、投流…(價格從 QT 既有報價 items 統計出常見單價)
- 搬 QT quotes → CRM `quotes`(HKD,docNo 沿用 `Q-YYYY-NNN` 由 `nextDocSeq` 補發);signed 的再建 `contracts`(已簽署;items 加上精剪/AI/數字人條數;signDate/startDate/endDate 取自客戶)
- `customers[].aiPoints` → `creditLedger`
- 驗收:CRM 儀表板 HKD 桶的簽約金額 = QT 原 `totalSignedRevenue`(逐客戶核對);合同 items 的條數合計 = QT `contractTotal`
- 前端:QT 的報價 Tab 改成唯讀連結「在 CRM 查看」;新報價在 CRM 開(有價目、有毛利、有列印)

### 階段 3:收入視角合一(1 天)
- CRM 儀表板加:「自營 IP 月收入」卡(讀 `ips`)、「客戶點數餘額總額」卡(讀 `creditLedger`)
- 客戶詳情加:點數餘額、製作進度摘要、帳號成效(讀 `qtProfiles`)
- 驗收:一個畫面能回答「本月簽了多少、IP 賺多少、客戶還有多少預付」,三個數字分開不混

### 階段 4:交付掛合同(1 天)
- `productions` 加 `contractId`;既有資料按 customerId → 該客戶最新已簽署合同回填
- CRM 合同詳情顯示製作進度(已完成/進行中/待製作 條數,點進去開 QT)
- 驗收:每筆有簽約的 production 都掛到合同;合同「執行中→已完成」可由製作全部 completed 時提示

### 階段 5(技術合流,讓上面長期可維護;1–2 週)
- 一個 server、一個 SQLite:以 WowCRM `server/` 為底合入 QT 的使用者管理與 `/api/state`;`ENTITIES` 加入 QT 保留的 entity;權限按 entity policy 表;同時 serve React `dist/` 與 `workbench/`
- 資料搬遷腳本先在 /tmp 用兩份副本預演(QT 已有 `ops/merge-preview.sh`,先看能否直接用);保留舊容器一週可回滾
- 驗收:全部既有 API 冒煙通過(`docs/playbook/diagnosis.md` 第三節);兩個前端同一 token 登入
- 在階段 5 之前,階段 1–4 可用「共用 JWT_SECRET + 跨域讀對方 API」先跑,不必等合流

### 可選:QT 介面重寫成 React 併入 CRM 側欄
只有在階段 5 穩定後、且你想要單一介面時再做;成本是重做圖表(Chart.js)、Word 匯入(mammoth)、爬蟲配置頁。

## 六、不動的東西
- 爬蟲(`workbench/crawler/*.py`)本地跑,與合併無關
- `AUDIT.md` 的 cookie 明文風險屬爬蟲配置頁,維持「真 cookie 只放伺服器端」的建議
- IP 孵化、爆款視頻、對標帳號、B-roll 四個模組原樣保留,只是換成讀同一份使用者
