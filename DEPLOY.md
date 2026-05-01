# EC2 部署指南

## 架構

```
EC2 (Ubuntu, t3.medium, Docker 已裝)
├── /opt/wowcrm/docker-compose.yml   ← deploy 自動寫入
├── /opt/wowcrm/.env                 ← deploy 自動寫入（含 JWT_SECRET）
├── /var/lib/wowcrm/wowcrm.db        ← SQLite 資料（永遠不會被 deploy 動到）
└── Docker container: ghcr.io/clawrus928/wowcrm:latest
    ├── 前端 React app（Vite build）
    ├── Node.js + Fastify API
    └── 監聽 :8080 → host :80
```

## 一次性設定（你要做的）

### 1. 設定 GitHub Secrets

打開 https://github.com/clawrus928/wowcrm/settings/secrets/actions → `New repository secret`

新增 4 個：

| Secret 名稱 | 值 | 說明 |
|---|---|---|
| `EC2_HOST` | `xx.xx.xx.xx` | EC2 公開 IP |
| `EC2_USER` | `ubuntu` | EC2 預設用戶 |
| `EC2_SSH_KEY` | (整段 PEM 私鑰，包含 `-----BEGIN ...-----` 和 `-----END ...-----`) | EC2 SSH 私鑰 |
| `JWT_SECRET` | `openssl rand -base64 32` 產生的隨機字串 | 簽 token 用，至少 32 字元 |
| `DEFAULT_PASSWORD` | `wowcrm`（或你想要的） | 11 個業務的初始密碼 |

> 產生 JWT_SECRET：在你電腦終端機跑 `openssl rand -base64 32`，把輸出整段貼上去。

### 2. EC2 安全組（Security Group）

確認入站規則開了：
- Port 22 (SSH) — 只開你的 IP
- Port 80 (HTTP) — 開 0.0.0.0/0（讓所有人能看 CRM）

### 3. EC2 上的 Docker

確認 Docker + Docker Compose 已裝：
```bash
ssh ubuntu@<EC2_IP>
docker --version          # 應該回 28.x 或更新
docker compose version    # 應該回 v2.x
```

如果 `docker compose` 報錯（沒裝 plugin）：
```bash
sudo apt-get update
sudo apt-get install -y docker-compose-plugin
```

確認 `ubuntu` 用戶能直接跑 docker（不用 sudo）：
```bash
sudo usermod -aG docker ubuntu
# 退出再重連 SSH
```

## 觸發部署

設定好 secrets 後，**push 任何東西到 master** 就會自動：
1. 建 Docker image
2. 推到 GitHub Container Registry
3. SSH 到 EC2
4. 拉新 image、重啟容器
5. 健康檢查（http://EC2_IP/api/health）

也可以**手動觸發**：
https://github.com/clawrus928/wowcrm/actions/workflows/deploy.yml → `Run workflow`

## 部署後使用

打開 `http://<EC2_IP>/` → 登入畫面 → 選帳號 + 輸入密碼（預設 `wowcrm`）→ 進去 CRM。

## 資料安全

- **重新部署不會動資料** — DB 在 host 的 `/var/lib/wowcrm/`，container 改都不影響
- **備份指令**（在 EC2 上跑）：
  ```bash
  sudo cp /var/lib/wowcrm/wowcrm.db /var/lib/wowcrm/wowcrm.backup.$(date +%F).db
  ```
- 想搬到別處：把 `/var/lib/wowcrm/wowcrm.db` 整個檔複製過去就完成搬遷

## 之後要做的（建議）

1. **HTTPS** — 用域名 + Let's Encrypt（caddy 兩行設定就好）
2. **每個業務改自己密碼** — 目前 11 人共用 `wowcrm`，可加「改密碼」UI
3. **定期備份** — 加一個 cron job 把 db 上傳到 S3
4. **監控** — uptime 監控 / 錯誤警報

需要時告訴我，我幫你做。
