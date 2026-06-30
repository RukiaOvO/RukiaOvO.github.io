# RukiaOvO.github.io

个人主页：GitHub Profile 风格仪表盘 + 个人主页 + 技术帖子入口。
当前站点仍使用 Hugo 构建并部署到 GitHub Pages，核心页面通过自定义模板维护：

- 首页：个人名片、GitHub 热力图、今日天气、Steam 状态、GitHub Issues 留言区
- 帖子：技术帖子、论文阅读与阶段总结入口
- 动态：GitHub 公开动态与中文 RSS 外部信息流

## Steam 状态

Steam 状态现在只走 Cloudflare Worker 这一条实时链路。浏览器只轮询 Worker 暴露的 JSON 接口，不再保留 GitHub Actions 的 Steam 快照分支。

Worker 地址：
```text
https://rukia-steam-status.1403555427.workers.dev/
```

站点配置位于 `data/home.yaml`：
```yaml
steam:
  workerUrl: "https://rukia-steam-status.1403555427.workers.dev/"
```

验证方式：
```bash
curl "https://rukia-steam-status.1403555427.workers.dev/"
```

如果返回 `ok: true` 且包含 `onlineState`，首页会优先显示 Worker 返回的实时状态，并每 30 秒轮询一次。

## 本地开发
```bash
hugo server --bind 127.0.0.1 --port 1313 --disableFastRender
```

构建检查：
```bash
hugo --minify
node --check assets/js/homepage-live.js
```

## 主要维护入口

- `data/home.yaml`：主页文案、社交链接、天气城市、RSS 源、GitHub/Steam 配置
- `layouts/partials/home/custom.html`：首页结构
- `layouts/posts/list.html`：帖子列表页
- `layouts/activity/list.html`：动态页
- `assets/js/homepage-live.js`：天气、GitHub 动态、RSS、Steam、留言区数据读取
- `assets/css/custom.css`：统一视觉系统与响应式布局
