# wowcrm 部署 EC2 任務書（給 agent 執行）

**目的**：把 `clawrus928/wowcrm` 從目前狀態（PR #10 已開未合併）部署到使用者的 EC2，跑起來能在 `http://<EC2_IP>/` 看到登入畫面。

**Agent 需要的權限**：
- GitHub repo `clawrus928/wowcrm` 寫入權限（合併 PR、設 Secrets）
- EC2 的 SSH 存取（host / user / private key 由使用者提供）
- 本機能跑 `openssl`、`curl`、`ssh`

---

## 使用者必須提供的輸入

執行前向使用者拿到：

| 變數 | 說明 | 範例 |
|---|---|---|
| `EC2_HOST` | EC2 公開 IP | `13.250.45.67` |
| `EC2_USER` | EC2 SSH 用戶 | `ubuntu` |
| `EC2_SSH_KEY` | 私鑰整段（PEM） | `-----BEGIN OPENSSH PRIVATE KEY-----\n...\n-----END OPENSSH PRIVATE KEY-----` |
| `DEFAULT_PASSWORD` | 11 業務的初始密碼 | （由使用者決定，建議 ≥8 字） |

不要從別處猜或預設這 4 個值。

---

## Step 1：產生 `JWT_SECRET`

在 agent 自己的環境跑：

```bash
openssl rand -base64 32
```

把輸出記下來，下一步會用。**不要重複產生**，一旦寫到 GitHub Secret 就固定下來，否則之前發的 token 全失效。

驗證：輸出應該是 44 個字元的 base64 字串（含 `=` 結尾）。

---

## Step 2：把 SSH 私鑰存成本機暫存檔（agent 自用）

```bash
SSH_KEY_FILE=$(mktemp)
cat > "$SSH_KEY_FILE" <<'EOF'
<把 EC2_SSH_KEY 整段貼這裡，包含 BEGIN / END>
EOF
chmod 600 "$SSH_KEY_FILE"
```

驗證能 SSH：

```bash
ssh -i "$SSH_KEY_FILE" -o StrictHostKeyChecking=no \
    -o ConnectTimeout=10 \
    "$EC2_USER@$EC2_HOST" 'echo OK && hostname'
```

預期輸出包含 `OK`。如果失敗：
- 確認 EC2 安全組 port 22 開放給 agent 的出口 IP
- 確認 `EC2_USER` 正確（Ubuntu AMI 是 `ubuntu`）
- 私鑰格式正確（`-----BEGIN ... -----END ...`，且每行未斷掉）

---

## Step 3：EC2 prep 檢查

```bash
ssh -i "$SSH_KEY_FILE" -o StrictHostKeyChecking=no "$EC2_USER@$EC2_HOST" '
  set -e
  echo "=== Docker ==="
  docker --version || { echo "❌ Docker 沒裝"; exit 1; }
  docker compose version || { echo "❌ Docker compose plugin 沒裝"; exit 1; }
  echo "=== ubuntu 能否不用 sudo 跑 docker ==="
  if docker ps > /dev/null 2>&1; then
    echo "✅ OK"
  else
    echo "⚠️  需要 sudo 才能跑 docker，幫你加到 group"
    sudo usermod -aG docker $USER
    echo "（要重新登入才生效）"
  fi
  echo "=== /var/lib/wowcrm（資料目錄） ==="
  sudo mkdir -p /var/lib/wowcrm
  sudo chown $USER:$USER /var/lib/wowcrm
  ls -ld /var/lib/wowcrm
  echo "=== /opt/wowcrm（部署目錄） ==="
  sudo mkdir -p /opt/wowcrm
  sudo chown $USER:$USER /opt/wowcrm
  ls -ld /opt/wowcrm
  echo "=== port 80 是否被佔 ==="
  ss -ltn | grep -E ":80\b" || echo "（未占用 OK）"
'
```

預期：全部綠 ✅，沒佔 port 80。如果 port 80 被佔（例如已有 nginx），先停掉或請使用者決定怎麼處理。

如果 ubuntu 用戶被加到 docker group，**斷開 SSH 重連一次**（`exit` 然後重新 `ssh`），下面的指令才能不用 sudo 跑 docker。

---

## Step 4：確認 EC2 安全組

驗證 port 80 對 0.0.0.0/0 開放（讓 demo 能被外面訪問）：

如果 agent 有 AWS API 權限：

```bash
# 找出 EC2 的 security group
INSTANCE_ID=$(aws ec2 describe-instances \
  --filters "Name=ip-address,Values=$EC2_HOST" \
  --query 'Reservations[0].Instances[0].InstanceId' --output text)

SG_ID=$(aws ec2 describe-instances --instance-ids "$INSTANCE_ID" \
  --query 'Reservations[0].Instances[0].SecurityGroups[0].GroupId' --output text)

# 開 port 80
aws ec2 authorize-security-group-ingress \
  --group-id "$SG_ID" --protocol tcp --port 80 --cidr 0.0.0.0/0 \
  || echo "（規則可能已存在，繼續）"
```

如果 agent 沒有 AWS 權限：請使用者手動到 AWS Console → EC2 → Security Groups → 該 SG → Inbound rules → Add rule（HTTP, 0.0.0.0/0）→ Save。

---

## Step 5：設 5 個 GitHub Secrets

用 `gh` CLI（agent 需先 `gh auth login` 或設好 `GH_TOKEN`）：

```bash
REPO=clawrus928/wowcrm

# 用 - 從 stdin 讀（避免 shell history 留痕）
gh secret set EC2_HOST --repo "$REPO" --body "$EC2_HOST"
gh secret set EC2_USER --repo "$REPO" --body "$EC2_USER"
gh secret set DEFAULT_PASSWORD --repo "$REPO" --body "$DEFAULT_PASSWORD"
gh secret set JWT_SECRET --repo "$REPO" --body "$JWT_SECRET"
gh secret set EC2_SSH_KEY --repo "$REPO" < "$SSH_KEY_FILE"
```

驗證：

```bash
gh secret list --repo "$REPO"
```

預期看到 5 個 secret 名稱（不會顯示值）。

---

## Step 6：合併 PR #10

```bash
gh pr merge 10 --repo clawrus928/wowcrm --squash
```

合併會自動觸發 `Deploy to EC2` workflow。

---

## Step 7：觀察 workflow run

```bash
# 找最新一次 run
RUN_ID=$(gh run list --repo clawrus928/wowcrm --workflow="Deploy to EC2" --limit 1 \
  --json databaseId --jq '.[0].databaseId')

# 跟著看
gh run watch "$RUN_ID" --repo clawrus928/wowcrm
```

預期：兩個 job 都綠（build-and-deploy）。約 5–10 分鐘。

如果 deploy step 紅，讀 log：

```bash
gh run view "$RUN_ID" --repo clawrus928/wowcrm --log-failed
```

常見錯誤：
- `Permission denied (publickey)` → SSH key 設錯，重設 `EC2_SSH_KEY`
- `Cannot connect` → host / port 22 / 安全組
- `unauthorized: ... ghcr.io` → GitHub Action 的 `packages: write` 權限沒過，檢查 repo Settings → Actions → General → Workflow permissions 是否「Read and write permissions」

---

## Step 8：驗證部署

```bash
echo "=== Health check ==="
curl -fsS "http://$EC2_HOST/api/health"
echo ""

echo "=== Frontend HTML ==="
curl -fsS "http://$EC2_HOST/" | head -c 200
echo ""

echo "=== Login 嘗試 ==="
curl -fsS -X POST "http://$EC2_HOST/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"u1\",\"password\":\"$DEFAULT_PASSWORD\"}" \
  | head -c 200
echo ""
```

預期：
- `/api/health` 回 `{"ok":true,"ts":"..."}`
- `/` 回 HTML，含 `<div id="root"></div>`
- login 回 `{"token":"eyJ...","user":{"id":"u1","name":"Alan Leong"}}`

---

## Step 9：清理

```bash
shred -u "$SSH_KEY_FILE" 2>/dev/null || rm -f "$SSH_KEY_FILE"
```

---

## 回報給使用者

部署成功後告訴使用者：

```
✅ 部署完成

URL：http://<EC2_HOST>/
登入：選任一帳號（Alan Leong 等 11 人），密碼 <DEFAULT_PASSWORD>
資料：保存在 EC2 的 /var/lib/wowcrm/wowcrm.db

⚠️ 注意：目前是 HTTP，登入密碼會明碼傳送。
正式給團隊使用前建議加上域名 + Let's Encrypt HTTPS。
```

如果失敗，把以下資訊回報：
1. 失敗的 Step 編號
2. 完整錯誤訊息
3. `gh run view <ID> --log-failed` 的輸出（如果是 workflow 階段失敗）

---

## 不要做的事

- 不要把 `EC2_SSH_KEY` 或 `JWT_SECRET` 印到 stdout / log
- 不要 commit 任何 secret 到 repo
- 不要動 `/var/lib/wowcrm/`（那是使用者資料）
- 不要 force push 到 master
- 失敗時不要重複跑 workflow 超過 3 次，先讀 log 找原因
