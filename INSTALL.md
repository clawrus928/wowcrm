# Openclaw Tasks — 安裝指南

## 項目文件結構

```
openclaw-tasks/
├── Dockerfile               # Docker 構建配置
├── deploy.sh                # 一鍵部署腳本
├── nginx.conf               # Nginx 配置（SPA 路由 + 緩存）
├── package.json             # Node.js 依賴
├── vite.config.js           # Vite 構建配置
├── index.html               # HTML 入口
├── .dockerignore             # Docker 忽略文件
├── README.md                # 項目說明
├── INSTALL.md               # ← 本文件
├── public/
│   └── favicon.svg          # 網站圖標
└── src/
    ├── main.jsx             # React 入口
    ├── App.jsx              # 主應用組件（所有頁面和邏輯）
    ├── storage.js           # 資料存儲層（localStorage，可替換為 API）
    ├── data.js              # 預設團隊成員和範例資料
    ├── theme.js             # 主題顏色、狀態、優先級等常量
    └── utils.js             # 工具函數（ID 生成、日期格式化等）
```

---

## 環境需求

- EC2 Ubuntu（已安裝 Docker）
- Security Group 開放 **Port 80**（HTTP）

---

## 安裝步驟

### 1. 上傳項目到 EC2

在你的本地電腦執行：

```bash
scp openclaw-tasks.zip ubuntu@YOUR_EC2_IP:~/
```

> 如果用 `.pem` 金鑰：
> ```bash
> scp -i your-key.pem openclaw-tasks.zip ubuntu@YOUR_EC2_IP:~/
> ```

### 2. SSH 連接到 EC2

```bash
ssh ubuntu@YOUR_EC2_IP
```

> 如果用 `.pem` 金鑰：
> ```bash
> ssh -i your-key.pem ubuntu@YOUR_EC2_IP
> ```

### 3. 解壓並進入項目

```bash
unzip openclaw-tasks.zip
cd openclaw-tasks
```

### 4. 一鍵部署

```bash
chmod +x deploy.sh
./deploy.sh
```

部署腳本會自動：
1. 構建 Docker image（Node.js 編譯 + Nginx 打包）
2. 停止舊容器（如有）
3. 啟動新容器，映射 Port 80

### 5. 訪問系統

打開瀏覽器，輸入：

```
http://YOUR_EC2_IP
```

---

## 預設帳號

| 帳號    | 密碼       | 角色     | 權限說明                 |
|---------|-----------|----------|------------------------|
| admin   | admin123  | 管理員   | 全部權限，管理成員和所有專案 |
| alex    | pass123   | 負責人   | 可建立和管理自己的專案     |
| bella   | pass123   | 成員     | 操作被分配的任務          |
| chris   | pass123   | 成員     | 操作被分配的任務          |
| diana   | pass123   | 成員     | 操作被分配的任務          |
| ethan   | pass123   | 觀察者   | 只讀，無法編輯            |

> ⚠️ 上線前請修改 `src/data.js` 中的預設密碼。

---

## 日常維護指令

```bash
# 查看容器狀態
docker ps

# 查看日誌
docker logs openclaw-tasks

# 重啟服務
docker restart openclaw-tasks

# 停止服務
docker stop openclaw-tasks

# 重新部署（修改代碼後）
./deploy.sh
```

---

## 修改團隊成員

編輯 `src/data.js`，修改 `TEAM` 陣列：

```javascript
export const TEAM = [
  { id: "u1", name: "你的名字", username: "login_name", password: "your_password", role: "admin" },
  { id: "u2", name: "成員A", username: "member_a", password: "secure_pw", role: "manager" },
  // ... 添加更多成員
];
```

角色選項：`admin` / `manager` / `member` / `viewer`

修改後重新部署：

```bash
./deploy.sh
```

---

## 修改端口

如果 Port 80 已被佔用，編輯 `deploy.sh`，修改 `PORT` 變量：

```bash
PORT=8080   # 改成你想要的端口
```

同時確保 EC2 Security Group 開放了對應端口。

---

## 添加 HTTPS（可選）

如果有域名，可以用 Certbot 加 SSL：

```bash
# 安裝 certbot
sudo apt update
sudo apt install -y certbot python3-certbot-nginx

# 先停止 Docker 容器
docker stop openclaw-tasks

# 安裝 Nginx 到宿主機
sudo apt install -y nginx

# 複製構建後的靜態文件
docker cp openclaw-tasks:/usr/share/nginx/html /var/www/openclaw

# 配置 Nginx 並申請證書
sudo certbot --nginx -d your-domain.com
```

---

## 資料存儲說明

目前使用瀏覽器的 **localStorage**：

- **共享資料**（專案、活動記錄、用戶列表）— 存在訪問該瀏覽器的 localStorage
- **私人資料**（個人待辦、登入狀態）— 同上，按用戶 ID 區分

### 限制

- 資料存在瀏覽器本地，換瀏覽器/設備需要重新操作
- 不同用戶在同一瀏覽器共享 localStorage（適合內部單機使用）

### 後續升級路徑

當需要真正的多設備/多人協作時，只需修改 `src/storage.js`，將 `loadShared` / `saveShared` / `loadPrivate` / `savePrivate` 四個函數改為 API 調用：

```javascript
// 升級範例：改為 API
export async function loadShared(key) {
  const res = await fetch(`/api/shared/${key}`);
  return res.json();
}

export async function saveShared(key, data) {
  await fetch(`/api/shared/${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}
```

---

## 故障排除

| 問題 | 解決方案 |
|------|---------|
| 訪問不了頁面 | 檢查 Security Group 是否開放 Port 80 |
| Docker build 失敗 | 確認 Docker 正在運行：`sudo systemctl status docker` |
| 容器啟動後馬上退出 | 查看日誌：`docker logs openclaw-tasks` |
| 忘記密碼 | 清除瀏覽器 localStorage 或修改 `src/data.js` 重新部署 |
| 頁面空白 | 按 F12 看 Console 錯誤，可能是瀏覽器不兼容 |
