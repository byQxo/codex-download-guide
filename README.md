# 郁的 Codex 下载站

基于 `codex-down/codexdown.cc` 的静态镜像，部署入口为 `download.yudidc.cc`。

## 本地运行

```powershell
npm install
npm run mirror
npm run build
$env:PORT=3000
$env:STATIC_DIR="dist"
npm start
```

访问 `http://127.0.0.1:3000/`，健康检查为 `/healthz`。

## 验证

```powershell
npm run verify
npm run test:e2e
```

## Docker

```powershell
docker compose -p yudidc-codex-download up -d --build
```

将 `download.yudidc.cc` 的 DNS 记录指向 Docker 主机，并由反向代理终止 TLS。`api.yudidc.cc` 保持现有 API Gateway 服务。

## 更新镜像

```powershell
npm run mirror
npm run verify
npm run build
```

镜像清单和 SHA-256 记录位于 `artifacts/`；上游基线位于 `vendor/codexdown-upstream/`。

