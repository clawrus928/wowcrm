# WOW CRM 網域核對

目標網域為 `wowcrm.wowmac.com`，使用者指定新加坡主機 `43.160.242.177`。部署規範見 [DEPLOY.md](DEPLOY.md)。舊主機 IP 與 `/opt`、`/var/lib` 配置不再作為新主機設定指南。

先在可信工作階段唯讀確認：

- DNS A/AAAA 是否導向預期主機或已知代理；不要僅憑文件宣稱 DNS 已更新。
- TLS 憑證的網域、有效期及實際由哪個服務終止 TLS。
- 實際 nginx/caddy 設定中的 server_name 與 upstream；repo 的 nginx/wowcrm.conf 只是範本。
- 預期 upstream 為 127.0.0.1:8002，容器內 8080 不應直接公開。
- 容器 image、Compose labels、/data mount 及 DB_PATH 與部署規範一致。

DNS 修改、憑證簽發、proxy reload、容器重啟屬寫入操作，應在核對並獲授權後分別進行。不要用刪除部署目錄或資料目錄「重來」。
