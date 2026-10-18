# Agent 部署接管指引

部署流程與前置條件以 [DEPLOY.md](DEPLOY.md) 為準。本文件取代舊版 EC2 自動設定、收集私鑰及推送 master 觸發部署的程序。

1. 先核對 GitHub workflow、分支保護與 production environment；不要用觸發部署測試設定。
2. 指定主機為 `43.160.242.177`，app/data 目標為 `/srv/apps/wowcrm`、`/srv/data/wowcrm`。指定目標不等於已驗證現況。
3. 只透過既有可信工作階段做主機唯讀核對，記錄 container image、mount、Compose labels、DB_PATH 及路徑對應，不輸出完整 Env、.env 或私鑰。
4. 若主機不可達或路徑不符，明確列出未驗證項目。不要新建空 DB、把舊路徑改成 symlink、複製運行中 SQLite，或嘗試用重啟解決。
5. 先完成並驗證修復 PR、主機接管與備份；經另行部署授權後才開啟部署 gate。
6. 不索取、不顯示 SSH 私鑰；不輪換既有 JWT/password/API key。Secrets 只能透過既有管理管道處理。

Cloud 中無法變更的 GitHub 管理設定與主機操作，不得寫成「已完成」。
