# RukiaOvO.github.io

个人主页：GitHub Profile 风格仪表盘 + 个人主页 + 技术帖子入口。

当前站点仍使用 Hugo 构建并部署到 GitHub Pages，核心页面通过自定义模板维护：

- 首页：个人名片、GitHub 热力图、今日天气、Steam 状态、GitHub Issues 留言区
- 帖子：技术帖子、论文研读与阶段总结入口
- 动态：GitHub 公开动态与中文 RSS 外部信息流

## Steam 状态同步

推荐使用 Cloudflare Workers 作为 Steam Web API 的边缘中转。Steam Web API Key 只保存为 Worker Secret，浏览器只访问 Worker 暴露的 JSON 接口。

### Cloudflare Workers 实时方案

代码位置：

- Worker 脚本：`workers/steam-status-worker.js`
- Wrangler 示例配置：`workers/wrangler.example.toml`

返回数据格式与前端兼容：

```json
{
  "ok": true,
  "steamId": "76561198417009401",
  "onlineState": "online",
  "statusText": "在线",
  "gameExtraInfo": "",
  "updatedAt": "2026-06-30T00:00:00.000Z",
  "source": "cloudflare-worker"
}
```

部署步骤：

1. 进入 Worker 目录：

   ```bash
   cd workers
   copy wrangler.example.toml wrangler.toml
   ```

2. 登录 Cloudflare：

   ```bash
   npx wrangler login
   ```

3. 写入 Steam Web API Key。该值会作为 Cloudflare Secret 保存，不要写入仓库：

   ```bash
   npx wrangler secret put STEAM_WEB_API_KEY
   ```

4. 部署 Worker：

   ```bash
   npx wrangler deploy
   ```

5. 记录部署后的 Worker URL，例如：

   ```text
   https://rukia-steam-status.<your-subdomain>.workers.dev
   ```

6. 回到仓库根目录，修改 `data/home.yaml`：

   ```yaml
   steam:
     workerUrl: "https://rukia-steam-status.<your-subdomain>.workers.dev"
   ```

7. 构建并推送站点：

   ```bash
   hugo --minify
   git add data/home.yaml
   git commit -m "chore: configure steam worker"
   git push origin main
   ```

验证方式：

```bash
curl "https://rukia-steam-status.<your-subdomain>.workers.dev"
```

如果返回 `ok: true` 且包含 `onlineState`，首页会优先使用 Worker，并每 30 秒轮询一次。若 `workerUrl` 为空，前端会回退到公开 Steam XML；若实时接口失败，会保留静态快照显示。

### GitHub Actions 兜底快照

`static/data/steam-status.json` 仍可由 GitHub Actions 定时生成，用作 Worker 不可用时的兜底快照。

1. 在 GitHub 仓库 `Settings -> Secrets and variables -> Actions` 中新增 Secret：
   `STEAM_WEB_API_KEY`
2. Steam ID 在 `.github/workflows/update-steam-status.yml` 中通过 `STEAM_ID` 配置：
   `76561198417009401`
3. workflow 每 5 分钟运行一次，也可以在 Actions 页面手动触发 `Update Steam status`
4. 同步脚本位于 `scripts/update-steam-status.mjs`，输出到：
   `static/data/steam-status.json`

## 本地开发

```bash
hugo server --bind 127.0.0.1 --port 1313 --disableFastRender
```

构建检查：

```bash
hugo --minify
node --check scripts/update-steam-status.mjs
```

## 主要维护入口

- `data/home.yaml`：主页文案、社交链接、天气城市、RSS 源、GitHub/Steam 配置
- `layouts/partials/home/custom.html`：首页结构
- `layouts/posts/list.html`：帖子列表页
- `layouts/activity/list.html`：动态页
- `assets/js/homepage.js`：天气、GitHub 动态、RSS、Steam、留言区数据读取
- `assets/css/custom.css`：统一视觉系统与响应式布局
