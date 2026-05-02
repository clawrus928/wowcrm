# 把 wowcrm 接到 `wowcrm.wowmac.com`

跟 ledger 一台 EC2 / 一個 nginx 共用，獨立 subdomain + port + service。
**Slug**: `wowcrm` ｜ **Subdomain**: `wowcrm.wowmac.com` ｜ **Port**: `127.0.0.1:8002` ｜
**Container**: Docker（已自帶 dist + API，不用 `/var/www/wowcrm`）

## Port 配給更新

| Port | App | Subdomain | Status |
|---|---|---|---|
| 8000 | ledger | `ledger.wowmac.com` | 🟢 |
| 8001 | _空_ | — | — |
| **8002** | **wowcrm** | **`wowcrm.wowmac.com`** | **🟢** |

---

## 一次性步驟（在 EC2 上）

### 1. GoDaddy 加 DNS

| Type | Name | Value | TTL |
|---|---|---|---|
| A | `wowcrm` | `13.236.95.177` | 600 |

驗證：

```bash
dig +short wowcrm.wowmac.com
# 應該回 13.236.95.177
```

### 2. 確認 EC2 安全組

- ✅ port 80 對 0.0.0.0/0（之前 ledger 已開）
- ✅ port 443 對 0.0.0.0/0
- ❌ **port 3002 / 8002 不要開**（container 只 bind 127.0.0.1，外網不該直接打）
  - 如果之前為了測試開了 port 3002，現在可以關掉

### 3. 部署最新 image（讓 container 改 bind 127.0.0.1:8002）

GitHub Action 會自動處理。要確認的話：

```bash
ssh ec2-user@13.236.95.177
docker ps --format 'table {{.Names}}\t{{.Ports}}' | grep wowcrm
# 應該看到：wowcrm    127.0.0.1:8002->8080/tcp
```

如果還顯示 `0.0.0.0:3002`，代表新 deploy 還沒跑。在本 repo 推一個小 commit 觸發，或 GitHub UI 手動 run workflow。

驗證 app 起來：

```bash
curl -fsS http://127.0.0.1:8002/api/health
# {"ok":true,"ts":"..."}
```

### 4. 放 nginx site conf

repo 裡已有範本：[`nginx/wowcrm.conf`](./nginx/wowcrm.conf)。複製到 EC2：

```bash
# 從本機推
scp nginx/wowcrm.conf ec2-user@13.236.95.177:/tmp/wowcrm.conf

# EC2 上
sudo mv /tmp/wowcrm.conf /etc/nginx/conf.d/wowcrm.conf
sudo nginx -t && sudo systemctl reload nginx
```

煙霧測試（HTTPS 還沒裝）：

```bash
curl -sI -H "Host: wowcrm.wowmac.com" http://127.0.0.1/
# 預期：HTTP/1.1 200 OK + content-type: text/html
```

### 5. HTTPS（Let's Encrypt）

```bash
sudo certbot --nginx -d wowcrm.wowmac.com
```

certbot 會自動改寫 `/etc/nginx/conf.d/wowcrm.conf` 加上 `listen 443 ssl;` 和 80→443 轉跳。續約 cron 已經在 ledger 那次裝過，這次直接繼承。

### 6. 煙霧測試

```bash
curl -sI https://wowcrm.wowmac.com/
# HTTP/2 200, content-type: text/html

curl -fsS https://wowcrm.wowmac.com/api/health
# {"ok":true,"ts":"..."}

curl -sI http://wowcrm.wowmac.com/
# 301 → https://

curl -sI -m 5 http://13.236.95.177/
# 連不上（default_server 444，從 ledger 設好）
```

打開 https://wowcrm.wowmac.com/ → 看到 wowcrm 登入畫面 → 右下角看到對的 git SHA → 完成 ✅

---

## 之後的部署

push 到 master → GitHub Action 自動：
1. build Docker image
2. push 到 ghcr.io
3. SSH 到 EC2
4. `docker compose pull && docker compose up -d`
5. 健康檢查 `127.0.0.1:8002/api/health`

nginx 不需要重 reload（它一直指向 8002，container 換掉也沒差）。

---

## Checklist

- [ ] DNS A record `wowcrm` → `13.236.95.177`，dig 通過
- [ ] EC2 安全組 80/443 對外開、8002 **不對外**
- [ ] master 部署過一次，container ports 顯示 `127.0.0.1:8002->8080`
- [ ] `curl 127.0.0.1:8002/api/health` 200
- [ ] `/etc/nginx/conf.d/wowcrm.conf` 寫入，`nginx -t` 通過
- [ ] `curl -H "Host: wowcrm.wowmac.com" http://127.0.0.1/` 200
- [ ] certbot 拿到證書
- [ ] `https://wowcrm.wowmac.com/` 看到登入頁，右下角 SHA 和 master HEAD 對得上
- [ ] 裸 IP `http://13.236.95.177/` 仍 444（沒被覆蓋）

---

## 移除（將來不用 wowcrm 時）

```bash
# 停服務
docker compose -f /opt/wowcrm/docker-compose.yml down
sudo rm -rf /opt/wowcrm

# 拿掉 nginx
sudo rm /etc/nginx/conf.d/wowcrm.conf
sudo nginx -t && sudo systemctl reload nginx

# 拿掉憑證
sudo certbot delete --cert-name wowcrm.wowmac.com

# 備份再刪資料
sudo tar czf ~/wowcrm-data-backup.tgz /var/lib/wowcrm
sudo rm -rf /var/lib/wowcrm
```

GoDaddy 那邊把 `wowcrm` A record 一起刪。
