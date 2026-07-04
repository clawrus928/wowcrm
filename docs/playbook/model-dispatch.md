# 模型調度守則

> 讀者:本 repo 的主對話模型(通常是 Sonnet 或 Opus)。
> 目的:貴的算力只花在「換便宜模型就掉品質」的判斷上;其餘全部外包。
> 型號與參數查證於 2026-07-04 的 remote Claude Code 環境;**每個 session 開工時以當時 system prompt 所列為準**,清單不符時照本檔規則類推,並把差異記進 lessons.md。

## 0. 開工先盤點(30 秒)

看 system prompt 裡的:可用 agent types、Agent 工具的 model 枚舉、可用 skills。**不要憑記憶引用本檔沒寫或當時沒列的型號/工具**。

## 1. 查證過的實際值(2026-07-04)

- 模型 ID:`claude-fable-5`、`claude-opus-4-8`、`claude-sonnet-5`、`claude-haiku-4-5-20251001`
- Agent 工具 `model` 參數枚舉:`sonnet` | `opus` | `haiku` | `fable`
  - `fable` 在未來 session 是否可用:**未確認**。預設不要填它;規劃時把 `opus` 當最高檔。
- **Agent 工具沒有 effort 參數**(常被記錯)。effort 只存在於 Workflow 工具的 `agent()` 選項:`low|medium|high|xhigh|max`;而 Workflow 需使用者明說(如「用 workflow」「ultracode」)才可動用。
- Agent types:`Explore`(唯讀搜尋)、`general-purpose`(全工具)、`Plan`(規劃,唯讀)、`claude`(泛用)、`claude-code-guide`(查 Claude Code 本身的問題)、`statusline-setup`(不相關)。

## 2. 指揮官不下場

主對話模型**只做**四件事:
1. 拆解任務、決定順序與交辦
2. 業務語意判斷(幣別怎麼算、什麼情境要 confirm、UI 該長怎樣)
3. 整合 subagent 回報、下最終結論
4. 對使用者溝通

以下**一律外包**,主模型自己動手就是違規:
| 工作 | 派誰 | model |
|---|---|---|
| 找定義/呼叫點、掃目錄、「X 在哪」 | Explore | `haiku` |
| 跨多檔的機械式批次修改(pattern 已知) | general-purpose | `sonnet` |
| 跑測試、冒煙驗證、read-back 檢查 | general-purpose | `haiku`(純執行)/`sonnet`(要判讀) |
| 查外部文件、網頁研究 | general-purpose | `sonnet` |
| 實作規劃(要讀很多檔才能定方案) | Plan | `sonnet`,難題 `opus` |
| 對抗式審查、第二意見 | general-purpose | 與產出者**不同檔次或不同 prompt 角度** |

例外:單一檔、已知行號、三步內完成的小改動,主模型直接做比交辦便宜——判準:**交辦說明文字比改動本身還長,就自己做**。

## 3. 交辦三要素(缺一不發)

每個 Agent prompt 必含:
1. **目標與動機**——做什麼+為什麼(subagent 看不到主對話,一句背景能省它十次試錯)
2. **驗收條件**——可機械判定,如「`npm run build` 綠燈」「curl POST 回傳含 docNo 欄位」「三個檔都 grep 得到該 prop」
3. **回報格式**——見第 4 節回報合約

填空範本在 `docs/playbook/templates.md`,按任務型態抄。

## 4. 回報合約(subagent 必守,寫進每個交辦 prompt)

- 只回:**結論 + 證據(檔案:行號)+ 驗收條件逐條 pass/fail**
- 禁止貼整檔內容、完整 log;超過 30 行的產物寫到 scratchpad 檔案,回傳路徑
- 沒把握的結論要標「不確定」,不准編造;找不到就說找不到+已試過哪些搜法
- 改了檔案的,回報列出改過的每個檔與大意

## 5. 升降級路徑

- **haiku 錯 1 次** → 同任務升 `sonnet` 重派(附上 haiku 的錯誤輸出)
- **sonnet 同一子任務連錯 2 次** → 升 `opus`,交辦 prompt **必須附完整失敗軌跡**(兩次都試了什麼、錯在哪),否則 opus 會重蹈覆轍
- **opus 也解不了** → 停,整理狀況問使用者;不要無限升級空轉
- **解出模式後降級**:一旦某類問題找到固定解法(pattern 明確了),把解法寫成規格,降回 `haiku`/`sonnet` 批次套用剩餘部分
- **同一件事最多重試兩輪**(不論升級與否),超過= 方向錯訊號,查 `judgment.md` 第 4 節換路

## 6. 驗證不自驗

寫的人不能當驗的人。產出完成後:
- **檔案類**:派 fresh-context agent(`haiku`)read-back——檔案存在、非空、章節齊全、內文與交辦規格一致
- **程式碼類**:測試或實跑(build + server 冒煙,見 `diagnosis.md` 第三節);由另一個 agent 執行並回報 pass/fail
- **高風險判斷**(業務語意、會動生產行為的邏輯):第二意見——用不同角度的 prompt 再派一個 agent 挑戰結論;或產出 2–3 個候選答案後派評審 agent 擇優
- fresh-context = 新派的 agent,**不要**用 SendMessage 延續舊 agent(舊 context 會沿用產出者的盲點)

## 7. 並行紀律

互不依賴的交辦,**一則訊息同時發**(並行跑);有依賴的等前一個結果再發。並行上限抓 3–4 個,再多主對話會被回報淹沒。
