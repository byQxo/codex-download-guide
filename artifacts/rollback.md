# 回滚说明

1. 停止当前容器：`docker compose down`。
2. 保留 `vendor/codexdown-upstream/` 作为上游基线。
3. 删除 `public/`、`dist/` 和 `artifacts/` 生成物。
4. 恢复上游 `index.html`，或切换到上一个 Git 提交后重新构建。
5. 重新执行 `docker compose build --no-cache && docker compose up -d`。

