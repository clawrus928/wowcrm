# Hermes Agent — WOW CRM 開發任務指引

當用戶要求修改 WOW CRM 功能時，按照以下流程執行。

## 前提

- 本機已安裝 Claude Code CLI（`claude` 指令可用）
- 本機已 clone `clawrus928/wowcrm` repo
- Git 可 push 到 GitHub
- `gh` CLI 已登入（用於開 PR）

## Repo 路徑

```
C:\Users\你的用戶名\wowcrm
```

> 如果路徑不同，請替換下方所有 `cd` 指令的路徑。

---

## 執行流程

### Step 1：拉取最新 master

```bash
cd C:\Users\你的用戶名\wowcrm
git checkout master
git pull origin master
```

如果有未提交的改動擋住 checkout，先：
```bash
git stash
git checkout master
git pull origin master
```

### Step 2：執行 Claude Code

把用戶的需求填入 `{TASK}` 位置：

```bash
claude --print "{TASK}。Read CLAUDE.md and PROJECT.md for context. After making changes, run 'npm run build' to verify the build passes. If build fails, fix the errors." --allowedTools "Edit,Write,Bash,Read"
```

範例：
```bash
claude --print "在客戶列表加一個 email 欄位，表單也要能輸入，詳情頁也要顯示。Read CLAUDE.md and PROJECT.md for context. After making changes, run 'npm run build' to verify the build passes. If build fails, fix the errors." --allowedTools "Edit,Write,Bash,Read"
```

### Step 3：檢查有沒有改動

```bash
git status
```

- 如果顯示 `nothing to commit, working tree clean` → **沒有改動**，跳到 Step 6
- 如果有改動 → 繼續 Step 4

### Step 4：建分支 + 提交

用需求的簡短英文描述當分支名（小寫、用 `-` 分隔）：

```bash
git checkout -b agent/{簡短描述}
git add -A
git commit -m "Agent: {用戶需求的中文標題}"
```

範例：
```bash
git checkout -b agent/add-customer-email
git add -A
git commit -m "Agent: 在客戶頁加 email 欄位"
```

### Step 5：Push + 開 PR

```bash
git push -u origin agent/{簡短描述}
gh pr create --title "Agent: {中文標題}" --body "由 Hermes Agent 自動提交。" --base master
```

記下 PR URL（`gh pr create` 會輸出）。

### Step 6：回報用戶

**有改動：**
```
✅ 已完成「{需求標題}」的開發。
PR：{PR_URL}
請 review 後合併，合併後會自動部署到 https://wowcrm.wowmac.com
```

**沒有改動：**
```
ℹ️ Claude Code 分析了你的請求，但沒有產生程式碼改動。
可能原因：功能已存在、描述不夠具體、或需要更多背景。
請補充細節後再試。
```

**執行失敗：**
```
❌ 執行過程出錯：{錯誤訊息}
請檢查後重試，或手動到 Claude Code 處理。
```

---

## 需求撰寫規範

Claude Code 的輸出品質取決於需求描述的清晰度。

### 好的需求（具體、可執行）

```
在客戶列表加一個 email 欄位：
- 列表表格加一欄 Email（在負責人後面）
- 客戶表單加一個 email 輸入框（用 TextInput，type=email）
- 客戶詳情面板顯示 email
- 驗證：email 格式不正確時顯示紅字
```

```
報價單新增「備註」欄位：
- 報價單表單底部加一個 textarea 備註欄位
- 列印預覽的付款明細上方顯示備註文字
- 資料庫不用特別處理（JSON storage 自動支援）
```

### 不好的需求（太模糊）

```
改一下客戶頁
```

```
加個功能
```

### 寫好需求的要點

1. **說清楚改哪裡**：哪個頁面 / 哪個表單 / 哪個列表
2. **說清楚加什麼**：欄位名稱、類型、位置
3. **說清楚行為**：驗證規則、預設值、觸發條件
4. **可選：提供參考**：「跟 XXX 欄位一樣的做法」

---

## 大功能拆分

如果需求很大（例如「加一個全新的模組」），拆成多次執行：

1. 第一次：「在 constants.js 加新 entity 的列舉值，在 server/src/db.js + index.js 加 CRUD，在 store.js 加 ENTITY_KEYS」
2. 第二次：「建 src/views/NewModule.jsx 列表頁 + 詳情 + 表單，參考 src/views/Channels.jsx 的結構」
3. 第三次：「在 Sidebar.jsx 和 MobileBottomNav.jsx 加導航，在 App.jsx 加路由」

每次跑完 verify build、commit、push。

---

## 部署驗證

PR 合併到 master 後，GitHub Actions 自動部署到 EC2（3–5 分鐘）。

確認部署完成：
```bash
curl -s https://wowcrm.wowmac.com/api/health
```

回 `{"ok":true}` 就是成功。

頁面右下角的 git SHA 會顯示最新版本。

---

## 緊急回滾

如果部署後發現問題：

```bash
cd C:\Users\你的用戶名\wowcrm
git log --oneline -5              # 找到上一個好的 commit
git revert HEAD --no-edit         # revert 最新 commit
git push origin master            # push → 自動重新部署
```

---

## 注意事項

- 每次只處理一個需求（不要同時跑多個 claude 指令）
- 跑之前一定先 `git pull` 拉最新
- 跑完一定檢查 `git status` 確認有改動才 commit
- 不要 `git push --force`
- 不要直接 push 到 master（一定走 PR）
- 用戶沒確認前不要合併 PR
