# 快速診斷 — 此環境最花 token、最易失焦、最易出錯的地方

> 讀者:在 wowcrm repo 工作的任何 Claude 模型(含 Sonnet / Haiku)。
> 每一條都是「症狀 → 為什麼 → 照做的修法」。修法都是可直接執行的動作,不是原則。
> 來源:2026-07 Fable 5 session 的實際觀察。排名是經驗判斷,非量測數據。

## 一、最漏 token 的前三名

### 1. 整檔讀大檔、改完又讀回
`src/views/*.jsx` 每檔 300–600 行,`server/src/index.js` 更長。整檔 Read 一次 = 數千 token;改完再 Read 驗證 = 再花一次。
**修法(照做)**:
1. 先 `Grep`(pattern + `-n`)拿行號,再 `Read` 帶 `offset`/`limit`,只讀目標 ±15 行。
2. Edit / Write 成功回傳 = 已改對,**不要**再 Read 回來看。失敗工具會報錯。
3. 同一檔多處修改:一次規劃好,連續下多個 Edit,不要每改一處讀一次。

### 2. 原始輸出直接留在主對話
build log、curl 回傳的完整 JSON、`git diff` 全文,動輒上千行。
**修法(照做)**:
1. Bash 一律接管線過濾:`npm run build 2>&1 | grep -E "built in|error|Error" | head -3`。
2. curl 驗證只抽關鍵欄位:`| sed -n 's/.*"docNo":"\([^"]*\)".*/\1/p'` 這類。
3. 產物超過 ~30 行 → 寫進 `/tmp/claude-*/scratchpad/` 檔案,對話只留路徑與一句結論。

### 3. 主模型自己做大面積掃描與機械式批次改動
掃 repo 找所有呼叫點、跨十個檔改同一個 pattern——這種工作換便宜模型品質不掉,主模型做就是純浪費。
**修法(照做)**:派 subagent,規則見 `docs/playbook/model-dispatch.md`。一句話版本:找東西 → `Explore`(model: haiku);批次改+驗證 → `general-purpose`(model: sonnet);主對話只收「結論 + 檔案:行號」。

## 二、最易失焦的前三名

### 1. 多項 backlog 一口氣做,中途斷線全部重來
session 隨時可能被 interrupt 或 context 被摘要。
**修法(照做)**:開工先 `TaskCreate` 按組拆(3–6 項一組);**每完成一組立刻 `npm run build` + `git commit`**。commit 訊息寫清楚做了什麼,斷線後下一個 session 從 `git log` 就能接手。

### 2. 修 A 時看到 B 也想修(scope creep)
改幣別邏輯時看到旁邊命名不好、順手重構——結果 diff 混雜、驗證範圍失控。
**修法(照做)**:發現非當前任務的問題 → 追加一條到 `docs/playbook/lessons.md` 的「待辦觀察」段或開一個 pending Task,**不當場修**。一個 commit 只做一件事。

### 3. 工具失敗後原地重試同一招
MCP 斷線、permission 被拒、同一個 Edit 連錯——重複同樣的呼叫只會燒 token。
**修法(照做)**:同一動作失敗 2 次 → 停,換方法(換工具、換路徑、縮小範圍)或按 `model-dispatch.md` 的升級規則處理。permission 被拒 = 使用者拒絕了,改做法,不要原樣重發。

## 三、最易出錯的前三名(repo 特有)

### 1. 「build 過了」≠「後端沒壞」
`npm run build` **只驗前端**。`server/src/` 的改動 build 照樣綠燈,炸在執行期。
**修法(照做)**:改到 `server/src/*` 時,除了 build,還要:
```bash
node --check server/src/index.js && node --check server/src/db.js
DB_PATH=/tmp/test.db PORT=8090 API_KEY=k JWT_SECRET=x node server/src/index.js &
# 等 health 通過後,curl 打你改到的端點,驗回傳欄位,最後 kill
```
測試 DB 一律用 `/tmp/`,**絕對不碰** `/data/` 與 `/var/lib/wowcrm/`(生產資料)。

### 2. 新 entity / 新欄位的多點註冊漏一處
新 entity 要同時登記 3 處:`server/src/db.js` ENTITIES、`server/src/index.js` ID_PREFIX、`src/data/store.js` ENTITY_KEYS。漏一處 = 執行期才炸,build 不會抓到。
**修法(照做)**:加 entity 時把這 3 個檔各 Grep 一次確認都有;完成後照上一條做 server 冒煙測試(POST 一筆、GET 回來)。

### 3. Drawer 的 prop 鏈斷裂(靜默 undefined)
View 的資料流是三段:`store` 解構 → Drawer JSX 傳 prop → 元件函式簽名接收。任何一段漏了,React 不報錯,畫面直接少東西。
**修法(照做)**:給 Drawer 加新資料時,固定檢查三處(以 Quotes 為例):
1. `const { quotes, contracts, ... } = store;` ← 有沒有解構
2. `<QuoteDetailDrawer contracts={contracts} ...>` ← 有沒有傳
3. `function QuoteDetailDrawer({ contracts, ... })` ← 有沒有接
改完 Grep 該 prop 名,三處都出現才算完。

另兩個高頻雷(排第三名之後,仍要知道):
- **幣別**:金額永遠帶 currency(預設 `"MOP"`);跨幣別不能直接相加,用 `sumByCurrency`/`fmtMulti`;商機自動合計只認同幣別已接受報價(`utils.js` 的 `acceptedQuoteSums`,key 是 `dealId|幣別`)。
- **刪除沒有級聯**:後端是通用 JSON 存儲,刪父記錄不會清子記錄。刪除功能一律先數關聯筆數、confirm 裡警告(照 `src/views/Deals.jsx` 刪商機的寫法)。
