# 任務：修復 https://wowcrm.wowmac.com 連不上

## 現狀
- 之前已部署 wowcrm，container 跑在 `127.0.0.1:8002`
- nginx 在 EC2，site conf 在 `/etc/nginx/conf.d/wowcrm.conf`
- DNS 已指向 `13.236.95.177`
- certbot 已跑過、SSL 證書還有 89 天
- nginx 確認在監聽 443
- ufw 關閉、ledger 在同台 EC2 用 nginx 沒問題
- **症狀**：從外面打 `https://wowcrm.wowmac.com/` 連線超時（HTTP 也試了會超時）

## 任務目標
讓 `https://wowcrm.wowmac.com/` 從一般網路打開能看到 wowcrm 登入頁，右下角顯示 git SHA。

## 第一個關鍵問題

**`https://ledger.wowmac.com/` 現在能不能連？**

- ✅ 能 → 跳到「Branch A：wowcrm 自身設定問題」
- ❌ 不能（也超時）→ 跳到「Branch B：EC2 整體網路 / 安全組問題」

這個問題決定後續方向，**先回答這個再做下面的事**。

---

## 一次性診斷（在 EC2 上跑，把全部輸出貼回來）

```bash
echo "=== 1. ledger 是否還活著（從外網對照） ==="
curl -sI -m 10 https://ledger.wowmac.com/ 2>&1 | head -5

echo ""
echo "=== 2. wowcrm.conf 完整內容（看 certbot 改完後長怎樣） ==="
sudo cat /etc/nginx/conf.d/wowcrm.conf

echo ""
echo "=== 3. nginx 載入後的 wowcrm server block ==="
sudo nginx -T 2>/dev/null | awk '/server_name wowcrm.wowmac.com/,/^}/' | head -40

echo ""
echo "=== 4. 從 EC2 自己打自己（繞過外網） ==="
curl -sv --max-time 10 https://wowcrm.wowmac.com/ \
  --resolve wowcrm.wowmac.com:443:127.0.0.1 2>&1 | tail -25

echo ""
echo "=== 5. container 狀態（port 該是 127.0.0.1:8002） ==="
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' | grep -E "NAMES|wowcrm"

echo ""
echo "=== 6. 後端健康檢查 ==="
curl -fsS http://127.0.0.1:8002/api/health 2>&1 || echo "FAILED"

echo ""
echo "=== 7. nginx 最近錯誤 ==="
sudo tail -30 /var/log/nginx/error.log

echo ""
echo "=== 8. 兩個 site 的 ssl_certificate 路徑（對照差異） ==="
sudo nginx -T 2>/dev/null | grep -E "server_name|ssl_certificate " | grep -A1 -E "wowcrm|ledger"
```

把上面 8 個區塊的輸出**全部貼回**。

---

## Branch A：ledger 能連，wowcrm 不能

代表網路 / 安全組 / nginx daemon 都沒問題，問題在 wowcrm 的 conf。常見原因和修法：

### A1. wowcrm.conf 沒有 `listen 443 ssl;` server block

certbot 可能跑失敗或寫到別處。**檢查上面診斷 #2 的輸出**：

- 如果整個檔只有 `listen 80;` 那一個 server block → certbot 沒改成功
- 修法：

```bash
sudo certbot --nginx -d wowcrm.wowmac.com --redirect --non-interactive --agree-tos -m <YOUR_EMAIL>
sudo nginx -t && sudo systemctl reload nginx
```

### A2. 443 server block 存在，但 `proxy_pass` 指錯 port

**檢查 #3 的輸出**裡的 `proxy_pass` 行：

- 應該是 `proxy_pass http://127.0.0.1:8002;`
- 如果指到 `:3002` 或別的 → 改成 `:8002`

```bash
sudo sed -i 's|proxy_pass http://127.0.0.1:[0-9]*;|proxy_pass http://127.0.0.1:8002;|g' /etc/nginx/conf.d/wowcrm.conf
sudo nginx -t && sudo systemctl reload nginx
```

### A3. container 不在 8002

**檢查 #5 的輸出**：

- 應該看到 `127.0.0.1:8002->8080/tcp`
- 如果還顯示 `0.0.0.0:3002->8080/tcp` → 上次 deploy 沒成功，重新觸發：

```bash
cd /opt/wowcrm
docker compose pull
docker compose up -d --force-recreate
```

### A4. backend 沒回應（#6 FAILED）

```bash
docker logs wowcrm --tail=50
docker compose -f /opt/wowcrm/docker-compose.yml restart
```

如果 logs 顯示 db 開不了 → 檢查 `/var/lib/wowcrm` 權限：

```bash
sudo chown -R 1000:1000 /var/lib/wowcrm   # node 預設 uid
```

### A5. 從 EC2 自打也超時（#4 timeout）

代表 nginx 根本沒攔到 `wowcrm.wowmac.com` 的請求 → 沒 reload 或 conf 有語法錯誤但 `nginx -t` 沒擋住。

```bash
sudo nginx -t
sudo systemctl restart nginx       # 完整重啟而非 reload
```

---

## Branch B：ledger 也連不上

代表 EC2 出口或安全組壞了。**注意：別動 wowcrm 的 conf，這不是 wowcrm 問題**。

### B1. EC2 安全組 inbound 80/443

```bash
# 從本機（agent 環境，需要 AWS CLI）
INSTANCE_ID=$(aws ec2 describe-instances \
  --filters "Name=ip-address,Values=13.236.95.177" \
  --query 'Reservations[0].Instances[0].InstanceId' --output text)
SG_ID=$(aws ec2 describe-instances --instance-ids "$INSTANCE_ID" \
  --query 'Reservations[0].Instances[0].SecurityGroups[0].GroupId' --output text)
aws ec2 describe-security-groups --group-ids "$SG_ID" \
  --query 'SecurityGroups[0].IpPermissions[?FromPort==`80` || FromPort==`443`]'
```

如果沒 80/443 對 `0.0.0.0/0`：

```bash
aws ec2 authorize-security-group-ingress --group-id "$SG_ID" \
  --protocol tcp --port 80 --cidr 0.0.0.0/0
aws ec2 authorize-security-group-ingress --group-id "$SG_ID" \
  --protocol tcp --port 443 --cidr 0.0.0.0/0
```

如果沒 AWS CLI 權限：請使用者手動到 AWS Console → EC2 → Security Groups 確認 80/443 inbound 對 0.0.0.0/0 開放。

### B2. EC2 公開 IP 變了

如果 EC2 重啟過（非 Elastic IP），公開 IP 會變。

```bash
# 從 EC2 內看實際 public IP
curl -s http://169.254.169.254/latest/meta-data/public-ipv4
```

如果跟 `13.236.95.177` 不同 → DNS 兩個 A record 都要改。

---

## 完成標準

`curl -sI https://wowcrm.wowmac.com/` 從外網回 `HTTP/2 200` 而且能在瀏覽器看到登入頁。

確認後跟使用者回報：
- 修了什麼（用上面哪一條）
- 目前 `https://wowcrm.wowmac.com/` 右下角顯示的 git SHA
- 如有改 nginx conf：把改完的 `/etc/nginx/conf.d/wowcrm.conf` 整段貼出來

---

## 不要做

- 不要 `rm -rf /var/lib/wowcrm`（資料）
- 不要 `docker compose down -v`（會刪 volume）
- 不要動 ledger 的任何檔（`/etc/nginx/conf.d/ledger.conf`、`/opt/ledger`、`/var/lib/ledger`）
- 不要把 8002 在 docker-compose 改成 `0.0.0.0:8002`（必須 `127.0.0.1:8002`）
- 不要把 wowcrm 的 PR / master 隨意 push 改 port（除非確定有對齊改 nginx）
