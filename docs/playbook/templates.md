# 任務交辦 prompt 範本

> 用法:抄對應範本,填 `{...}` 空格,整段作為 Agent 工具的 prompt 發出。
> `【】`內是給你(交辦者)看的選檔建議,發出前刪掉。
> 每份範本已內建回報合約;不要刪掉驗收條件段,那是 subagent 的完成定義。

## 1. 搜尋/定位 【Explore,model: haiku;範圍模糊或跨慣例命名時 sonnet】

```
在 /home/user/wowcrm 找:{要找什麼,例:所有呼叫 effectiveDealAmount 的地方}
背景:{為什麼要找,例:要把它替換成 dealAmount(deal, acceptedSums)}
範圍:{目錄/檔案類型,例:src/ 下的 .jsx 與 .js}
驗收條件:每個命中點都給出 檔案:行號 與該行內容;若一無所獲,列出你用過的所有搜尋 pattern。
回報格式:條列「檔案:行號 — 一句說明」,不要貼大段程式碼,不要總結廢話。
```

## 2. 實作 【general-purpose,model: sonnet】

```
任務:{做什麼,例:在 src/views/Channels.jsx 的渠道詳情加「本月轉介線索數」欄位}
動機:{為什麼,例:業務要在月會看渠道效益}
作法指引:{已定的方案/要仿的既有寫法,例:仿 Deals.jsx 詳情的 DetailRow 寫法;數字從 leads.filter(channelId 且 created 在本月) 來}
邊界:只動 {檔案清單};UI 文字繁體中文;金額用 fmt(amount, currency);不加 npm 依賴。
驗收條件(逐條回報 pass/fail):
1. npm run build 綠燈(貼 built in 那行)
2. {功能驗證,例:grep 確認新 prop 在 store 解構、JSX 傳遞、簽名接收三處都出現}
3. {若動 server:照 docs/playbook/diagnosis.md 第三節冒煙,貼 curl 關鍵回傳}
回報格式:改過的檔案清單(檔案:行號+一句大意)、驗收逐條 pass/fail、遇到的意外。不貼整檔內容。
```

## 3. 重構/批次修改 【general-purpose,model: sonnet;pattern 完全機械可 haiku】

```
任務:把 {舊 pattern} 全部改成 {新 pattern}。
動機:{例:acceptedQuoteSums 改了 key 格式,所有呼叫點要同步}
已知命中點:{檔案:行號清單——先派搜尋範本拿到,不要讓改的人自己找}
不許動:行為不變的重構,不順手改其他東西;發現可疑處記下來回報,不要修。
驗收條件(逐條回報 pass/fail):
1. npm run build 綠燈
2. grep {舊 pattern} 在 src/ 零命中
3. {行為驗證,例:grep 新 pattern 命中數 == 原命中數}
回報格式:每個檔的修改摘要一行、驗收逐條 pass/fail、你「沒有」改但覺得可疑的點。
```

## 4. 研究/查證 【general-purpose,model: sonnet】

```
問題:{要回答什麼,例:Fastify 4 的 onRequest hook 能不能拿到 body?}
背景:{為什麼問,決策用途}
來源優先序:{例:先查本 repo 現有用法(server/src/index.js),再官方文件,最後其他}
驗收條件:結論必須附來源(檔案:行號 或 URL);查不到就明說查不到+查過哪裡;禁止憑訓練記憶回答版本相關問題。
回報格式:結論(≤3 句)→ 證據清單 → 不確定的部分。超過 30 行的整理寫到 scratchpad 檔案回傳路徑。
```

## 5. 審查/驗證 【general-purpose;read-back 用 haiku,程式碼審查用 sonnet,高風險判斷第二意見用 opus】

```
你是 fresh-context 審查者,對以下產出做對抗式審查——你的價值在找出問題,不在說它很好。
審查對象:{檔案清單 或 git diff 範圍,例:git diff master...HEAD -- docs/}
產出者的驗收條件:{原交辦的驗收條件,逐條覆核}
額外檢查:
1. {例:規則之間有沒有互相打架}
2. {例:提到的路徑/工具名/型號是否真實存在——用 ls/grep 驗,不用印象}
3. {例:docs/playbook/judgment.md 第 5 節品質底線逐條掃}
驗收條件:每個發現附 檔案:行號 + 為什麼是問題 + 建議修法;零發現時要說明你驗了哪些面向才敢說零。
回報格式:發現按嚴重度排序;「確認正常」的項目一行帶過。
```

## 通用尾註(每份都適用)

- subagent 看不到主對話——所有它需要的背景都要寫進 prompt,寧可多一句。
- 驗收條件必須可機械判定;寫不出可機械判定的驗收 = 你自己還沒想清楚,先想清楚再交辦。
- 互不依賴的多個交辦,一則訊息同時發(並行)。
