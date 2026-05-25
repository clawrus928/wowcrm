# 秘書 Agent (Clawdi) 操作指引

給 AI Agent 讀的操作手冊。Agent 可透過 GitHub API 提交開發請求，
Claude Code 會自動實作並開 PR。

## 前提

- Agent 需要 **GitHub Personal Access Token (PAT)**，scope: `repo`
- Token 用在 `Authorization: Bearer <PAT>` header
- 目標 repo: `clawrus928/wowcrm`

---

## 提交開發請求

### Step 1: 建 GitHub Issue

```bash
curl -s -X POST \
  -H "Authorization: Bearer YOUR_GITHUB_PAT" \
  -H "Accept: application/vnd.github+json" \
  https://api.github.com/repos/clawrus928/wowcrm/issues \
  -d '{
    "title": "在客戶頁加個 email 欄位",
    "body": "## 需求\n在客戶列表和詳情頁加一個 email 欄位，表單也要能輸入。\n\n## 補充\n- 欄位名稱：email\n- 驗證：格式正確\n- 列表顯示在負責人欄後面",
    "labels": ["agent-task"]
  }'
```

> **重要**：`labels` 必須包含 `"agent-task"`，這會觸發 Claude Code workflow。

### Step 2: 等待 workflow 完成

建 Issue 後，GitHub Actions 會自動觸發。約 5–15 分鐘完成。

查詢最新 workflow run：
```bash
curl -s \
  -H "Authorization: Bearer YOUR_GITHUB_PAT" \
  "https://api.github.com/repos/clawrus928/wowcrm/actions/runs?event=issues&per_page=1" \
  | jq '.workflow_runs[0] | {status, conclusion, html_url}'
```

### Step 3: 取得 PR URL

workflow 完成後會在 Issue 上留 comment。讀 Issue comments：
```bash
curl -s \
  -H "Authorization: Bearer YOUR_GITHUB_PAT" \
  "https://api.github.com/repos/clawrus928/wowcrm/issues/ISSUE_NUMBER/comments" \
  | jq '.[-1].body'
```

回報給用戶：「PR 已開好：{PR_URL}，請 review 後合併。」

---

## Issue 撰寫指引

### 好的 Issue（具體、可執行）

```
標題：在線索列表加上「創建時間」篩選器

需求：
- 篩選列加一個日期範圍篩選器（開始日 / 結束日）
- 只顯示 created 在範圍內的線索
- 預設不篩選（顯示全部）

參考：
- 線索列表在 src/views/Leads.jsx
- 現有篩選器模式：看 fStatus / fSource 的 useMemo
```

### 不好的 Issue（太模糊）

```
標題：改一下線索頁
```

越具體，Claude Code 改出來的品質越高。

---

## 追蹤部署

PR 合併到 master 後，deploy workflow 自動跑（3–5 分鐘）。

驗證部署完成：
```bash
curl -s https://wowcrm.wowmac.com/api/health
# {"ok":true,"ts":"..."}
```

看版本 SHA（右下角）：
```bash
# 可以比對 master 最新 commit
curl -s \
  -H "Authorization: Bearer YOUR_GITHUB_PAT" \
  "https://api.github.com/repos/clawrus928/wowcrm/commits/master" \
  | jq -r '.sha[:7]'
```

---

## 常用操作

### 列出所有 agent-task issues
```bash
curl -s \
  -H "Authorization: Bearer YOUR_GITHUB_PAT" \
  "https://api.github.com/repos/clawrus928/wowcrm/issues?labels=agent-task&state=all"
```

### 列出 open PRs
```bash
curl -s \
  -H "Authorization: Bearer YOUR_GITHUB_PAT" \
  "https://api.github.com/repos/clawrus928/wowcrm/pulls?state=open"
```

### 合併 PR（如果用戶授權 agent 合併）
```bash
curl -s -X PUT \
  -H "Authorization: Bearer YOUR_GITHUB_PAT" \
  "https://api.github.com/repos/clawrus928/wowcrm/pulls/PR_NUMBER/merge" \
  -d '{"merge_method": "squash"}'
```

---

## 注意事項

- 每次只開一個 `agent-task` issue，等 workflow 跑完再開下一個
- 如果 workflow 失敗，去 GitHub Actions 看 log，補充資訊後重新加 label
- Agent 不需要直接存取 EC2 或 CRM API（所有改動走 GitHub → PR → deploy）
- 大型功能建議拆成多個小 issue，每個獨立可驗證
