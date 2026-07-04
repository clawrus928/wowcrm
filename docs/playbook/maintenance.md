# 維護協議 — playbook 自身怎麼演化

## 1. 權限分級

**模型可自行改(不必問使用者)**:
- `docs/playbook/lessons.md` — 踩雷即記,append-only(格式見第 2 節)
- `docs/playbook/templates.md` — 新增範本或補充填空欄位(不刪既有範本)
- `PROJECT.md` — 完成 PR 後補一段歷史(仿現有條目格式)
- `API_DOC.md` — 改了 API 就同步(不同步 = 文件說謊,比沒文件更糟)

**動之前必須先問使用者**:
- `CLAUDE.md` — 結構性改動(加刪章節、改硬規則);修錯字/更新失效路徑可直接改
- `docs/playbook/model-dispatch.md` 的升降級門檻、`judgment.md` 的既有 rubric —— 可以「新增」條目,「修改或刪除」既有條目要先問
- `docs/playbook/diagnosis.md` 的排名結論

**永遠不動(絕對禁令,使用者同意也不做,只能回覆做不到)**:`.env`、secrets、`/data/`、`/var/lib/wowcrm/`。
**需使用者明確要求才動**:`.github/workflows/deploy.yml`(與 CLAUDE.md 禁止清單同一規則)。

## 2. 踩雷教訓寫哪、怎麼寫

檔案:`docs/playbook/lessons.md`,新條目加在**最上面**,格式固定:

```
## YYYY-MM-DD 一句話標題
- 症狀:當時看到什麼
- 根因:真正的原因(不是表象)
- 規則:下次照做的一句話(可執行,不是「要小心」)
```

寫入時機:(a) 同一問題卡了兩輪以上才解開;(b) 驗證抓到自己以為完成其實沒完成;(c) 使用者糾正了你的方向。三者任一發生就寫,當下寫,不要等收尾。

## 3. 精簡門檻(防膨脹)

- `lessons.md` 超過 **150 行** → 做一次蒸餾:重複出現的模式上移進 `diagnosis.md` 或 `judgment.md`(這一步要問使用者,因為動到那兩檔),原始條目移到 `docs/playbook/_backup/lessons-archive.md`
- `CLAUDE.md` 超過 **150 行** → 超出部分抽成按需檔,只留路由
- `templates.md` 超過 **250 行** → 合併重複範本
- 每次蒸餾一個 commit,訊息寫「playbook 蒸餾:{摘要}」

## 4. 改 playbook 的驗證規則

playbook 自己也適用「驗證不自驗」:改了任何 playbook 檔,派一個 fresh-context agent(haiku)讀改動後的檔,回答:(1) 規則之間有沒有矛盾;(2) 引用的路徑是否存在;(3) 有沒有弱模型會誤讀的模糊句。有發現就修完再 commit。
