# RukiaOvO.github.io

个人主页：GitHub Profile 风格仪表盘 + 个人主页 + 技术帖子入口。

当前站点仍使用 Hugo 构建并部署到 GitHub Pages，核心页面通过自定义模板维护：

- 首页：个人名片、GitHub 热力图、今日天气、Steam 状态、GitHub Issues 留言区
- 帖子：技术帖子、论文研读与阶段总结入口
- 动态：GitHub 公开动态与中文 RSS 外部信息流

## Steam 状态同步

前端优先读取 `static/data/steam-status.json`，该文件由 GitHub Actions 定时生成，避免在浏览器中暴露 Steam Web API Key。

配置步骤：

1. 在 GitHub 仓库 `Settings -> Secrets and variables -> Actions` 中新增 Secret：
   `STEAM_WEB_API_KEY`
2. Steam ID 在 `.github/workflows/update-steam-status.yml` 中通过 `STEAM_ID` 配置：
   `76561198417009401`
3. workflow 每 30 分钟运行一次，也可以在 Actions 页面手动触发 `Update Steam status`
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
