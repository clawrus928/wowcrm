# WOW CRM 部署與接管

目標是新加坡主機 `43.160.242.177` 的 `wowcrm.wowmac.com`。這是指定目標，並非 Cloud 已實機驗證的結果。禁止把舊文件的 `/opt/wowcrm`、`/var/lib/wowcrm` 當成新主機的正確資料來源。

## 部署入口

- PR / push 到 `master` 執行 CI；合併不再部署或發佈 image。
- `Deploy WOW CRM` 只接受 `workflow_dispatch`，且只允許 `master`。
- repository variable `PRODUCTION_DEPLOY_ENABLED` 必須為字串 `true`；未設定即拒絕。
- 手動輸入 `confirm_host=43.160.242.177`，CI 通過後才進入 `production` environment。
- `production` 必須另行設定 required reviewers 與僅允許 master 的 deployment branch rule。YAML 引用 environment 不等於已設定審批。
- 部署使用該次 build 的 `ghcr.io/clawrus928/wowcrm@sha256:…`，不發佈或拉取 `latest`。
- `wowcrm-production` concurrency 會序列化部署，不取消正在執行的部署。

此修復未直接修改 GitHub 管理設定。舊 workflow 在修復合併前仍可能因 master push 執行；有權限的管理者應先停用舊部署入口，再審閱合併。不要為了測試設定而觸發部署。

## 主機布局與前置條件

| 項目 | 唯一目標 |
|---|---|
| 部署工作目錄 | `/srv/apps/wowcrm` |
| Compose | `/srv/apps/wowcrm/docker-compose.yml` |
| 主機既有應用設定 | `/srv/apps/wowcrm/.env`（不由 workflow 覆寫） |
| SQLite 主檔 | `/srv/data/wowcrm/wowcrm.db` |
| 容器 | `wowcrm`，Compose project `wowcrm` / service `app` |
| 容器資料 | `/srv/data/wowcrm` → `/data`，`DB_PATH=/data/wowcrm.db` |
| 反向代理 upstream | `127.0.0.1:8002` → 容器 `8080` |

需要 Python 3（含 sqlite3）、Docker、Compose v2，以及部署帳號對既有 app/data 目錄的必要權限。主機須能拉取 GHCR image；私有 image 的認證由既有主機管理管道配置，不在聊天提供憑證。

第一個遠端操作是 `scripts/deploy.py --check IMAGE_DIGEST COMMIT_SHA`，只讀取既有路徑中繼資料與容器設定。若資料檔不存在、掛載指向舊路徑、Compose project/service/working directory 不符，會停止，連 release 目錄都不建立。這不是首次安裝或資料遷移工具。

舊布局接管必須先在可信主機工作階段核對實際掛載、DB 檔案身分、現有設定與備份，另行審閱接管步驟。不要為了讓檢查過關就建立空 DB、移動資料、建立 symlink 或重建容器。

## Secrets 與 Variables

| 設定 | 位置與用途 |
|---|---|
| `EC2_HOST` | GitHub Secret，必須是 `43.160.242.177`；名稱沿用但不代表 AWS |
| `EC2_USER` | GitHub Secret，既有部署帳號 |
| `EC2_SSH_KEY` | GitHub Secret，既有 SSH 認證；不要索取、輸出或貼入聊天 |
| `WOWCRM_SSH_KNOWN_HOSTS` | GitHub Variable，經可信管道核對的目標主機 known_hosts 公鑰記錄；不以即時 ssh-keyscan 自動信任 |
| `PRODUCTION_DEPLOY_ENABLED` | Repository Variable，未完成接管/審批設定前保持未設定或 false |
| `GITHUB_TOKEN` | Actions 自動提供，用於 runner 發佈 GHCR image |
| `JWT_SECRET`、`DEFAULT_PASSWORD`、`API_KEY` | 保留主機既有 `.env`；本次部署不再從 GitHub 覆寫，也不輪換 |
| `ANTHROPIC_API_KEY` | Agent Task 使用的 GitHub Secret |
| `AGENT_TASK_ENABLED` | Repository Variable，必須為 true 才啟用 Agent Task；也只接受 repository owner 加 label |

GitHub 舊應用 Secrets 可以保留，本修復不刪除。新 Compose 要求三個應用設定皆非空；腳本也會確認它們與運行中容器一致，並拒絕開發用 JWT/default password。缺少 API_KEY 的主機須先透過既有管理管道完成獨立設定審閱，不能在此流程偷偷補值。`.env` 權限須限制為擁有者可讀寫；不 dump `docker inspect` 全部 Env 或 `docker compose config` 的展開結果。

## 發佈、備份及回復行為

1. Runner 檢查分支、固定主機、digest、SHA 與 known_hosts。SSH 嚴格校驗 host key，不轉送 SSH agent。
2. 唯讀核對既有布局；通過才把受版控 Compose 與 Python 部署腳本傳到 `/srv/apps/wowcrm/releases/<SHA>`。
3. 在主機取得部署鎖並重新核對；驗證新 Compose 的 mount、port、設定與舊容器一致。從不執行 `mkdir /var/lib/wowcrm` 或自動建立資料路徑。
4. 拉取精確 digest，核對 OCI revision label。以 SQLite backup API 取得一致性備份（包含 WAL 已提交資料），在只讀模式重開備份並檢查完整性、schema 及使用者存在。
5. 備份放在 `/srv/data/wowcrm/backups`，保留舊 Compose 與舊 image ID 的回復 override，權限限制為擁有者。這是同主機回復副本，不取代離機備份；需另行管理保留期限與磁碟容量。
6. 原子更新 Compose，只更新 `app`，不使用 `--remove-orphans`。驗證 HTTP、實際 image ID、mount、DB_PATH 及 DB 檔案 device/inode。
7. 發佈失敗時嘗試回復原 Compose 與原本機 image ID，再驗證健康。若回復也失敗，job 失敗並需人工處理；不宣稱服務已恢復。

**不自動回復資料庫。** 不用 `cp` 複製運行中的 SQLite 主檔，也不覆蓋新寫入。將來涉及 schema migration 的版本，必須先審閱應用回退相容性；不能把 image 回退當作資料回退。

目前腳本不自動清理舊 image 或備份，以保留回復能力。主機手動 Compose 操作需明確提供核准的 `WOWCRM_IMAGE`；不要退回 `latest` 或直接執行舊指南。

## GitHub 管理設定（程式碼無法代替）

在管理 API 可用的可信環境完成並核對：

1. 暫停舊部署 workflow；合併此修復本身不應部署。
2. 保護 master：要求 PR、審閱與 CI 的 `Build and smoke tests` status check，限制直接 push，禁止 force push / deletion。
3. 建立 production environment，設定 required reviewers、限制 master，避免自行審批；將 SSH 部署 Secrets 限定在該 environment，經管理者核對後移除 repository scope 的重複值，避免其他分支的 workflow 取得部署權限。
4. 經可信管道核對 SSH known_hosts，以及主機上的容器、目錄、DB、應用設定與 registry 權限。
5. 先在測試環境驗證；只有部署另行獲授權後，才開啟 PRODUCTION_DEPLOY_ENABLED 並手動執行。

## 本機驗證

使用 Node 20，在 repo 根目錄執行：

```bash
npm ci
npm ci --prefix server
npm run build
python3 -m unittest discover -s tests -v
python3 scripts/smoke.py
```

單元測試只使用臨時目錄及模擬 Docker；冒煙測試只綁定 127.0.0.1，使用 /tmp SQLite，完成後停止並清理。不要在正式主機上把測試套件當部署指令執行。
