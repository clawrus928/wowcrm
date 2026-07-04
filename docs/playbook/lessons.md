# 踩雷紀錄(新條目加最上面;格式與寫入時機見 maintenance.md 第 2 節)

## 2026-07-04 build 綠燈不代表後端沒壞
- 症狀:server/src 改動後 `npm run build` 通過,但 build 根本不編譯 server 目錄
- 根因:Vite build 只覆蓋前端;後端只有 node 執行期才會暴露錯誤
- 規則:動 `server/src/*` 必做 `node --check` + /tmp DB 起 server + curl 冒煙(見 diagnosis.md 第三節)

## 2026-07-04 通用 JSON 存儲沒有級聯刪除
- 症狀:刪商機後,其報價/合同/跟進紀錄全部變孤兒,關聯 id 懸空
- 根因:後端是 entity+JSON 通用存儲,無外鍵、無級聯
- 規則:所有刪除都先數關聯筆數並在 confirm 警告;需要連帶刪的(如商機→跟進紀錄)在前端逐筆 removeItem

## 2026-07-04 跨幣別金額不能直接加總
- 症狀:MOP 商機掛 RMB 已接受報價,自動合計顯示錯誤單位的數字
- 根因:acceptedQuoteSums 原本只按 dealId 加總,忽略 currency
- 規則:任何金額聚合都按幣別分桶(sumByCurrency / fmtMulti);單一數字輸出必須確認同幣別,composite key 用 `id|幣別`

## 2026-07-04 順序編號用 MAX 不用 COUNT
- 症狀:(預防性)文件編號若用「現有筆數+1」,刪舊單後會重發已用過的號
- 根因:COUNT 會隨刪除下降;正式文件編號重複是業務事故
- 規則:順序編號一律取現存最大序號+1(見 server/src/db.js nextDocSeq)

## 待辦觀察(非教訓,做別的任務時看到的可疑點;處理後劃掉)
- `claude/wowcrm-upgrade-qq4bn` 分支上有 4 個 audit commits(A1–A6,幣別修正/刪除警告/待辦卡/文件編號)尚未開 PR、未合併 —— 2026-07-04
