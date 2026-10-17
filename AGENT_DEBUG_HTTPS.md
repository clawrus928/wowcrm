# WOW CRM HTTPS 唯讀診斷

先讀 [DEPLOY.md](DEPLOY.md) 與 [SUBDOMAIN_SETUP.md](SUBDOMAIN_SETUP.md)。目標為 wowcrm.wowmac.com / 43.160.242.177；Cloud 未能連線時，不推定主機正常或異常。

按序核對 DNS、TLS、反向代理 upstream、127.0.0.1:8002、wowcrm 容器狀態與資料 mount。僅有 /api/health 回傳 ok 不能證明使用正確 DB 或正確 image。

- 不 dump 全部 docker inspect / 環境變數，不讀取 .env 或 SSH 私鑰內容。
- 不對資料目錄 chmod/chown，不建立舊路徑、不 restart/redeploy 來掩蓋問題。
- 不依據舊文件的 EC2 IP、AWS security group 或使用者名稱直接操作。
- 如需修復，先列出具體證據與方案；變更 DNS、proxy、權限或容器前取得相應授權。
