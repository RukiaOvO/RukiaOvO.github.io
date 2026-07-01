# RukiaOvO.github.io

使用 Hugo + GitHub Pages 构建的个人主页。

- 基于 [Blowfish](https://github.com/nunocoracao/blowfish) 主题并通过自定义模板、样式和前端脚本实现了 GitHub Profile 风格的仪表盘布局。

- 通过 Cloudflare Workers 拉取实时数据（GitHub 动态、RSS 订阅、Steam 状态等），实现内容的动态更新。

个人主页：[rukiaovo.github.io](https://rukiaovo.github.io/)

## 功能特性

- **GitHub Profile 风格仪表盘** — 自定义首页布局，含个人信息卡片、技能标签、时间线与社交链接
- **GitHub 热力图** — 每日跟踪 Github Profile 的Commit贡献热力图
- **GitHub 动态流** — 通过 Cloudflare Worker 代理展示公开活动（Push、PR、Issue 等）
- **外部 RSS 聚合** — 集成 B 站动态、番剧更新、IT 之家、36 氪、财联社等多类信息源
- **实时天气** — 基于 Open-Meteo API 获取城市天气
- **Steam 状态** — 通过 Cloudflare Worker 轮询公开 Steam 资料，实时更新Steam状态
- **访客计数** — 通过 Visitor Badge 统计页面访问量
- **Giscus 评论区** — 基于 GitHub Discussions 的留言系统，展示于首页仪表盘
- **昼夜主题变化** — 根据北京时间自动切换日间/夜间主题
- **响应式布局** — 移动端自适应，侧边栏自动折叠

## 技术栈

| 层面 | 技术 |
|------|------|
| 静态站点生成 | [Hugo](https://gohugo.io/) |
| 主题 | [Blowfish](https://github.com/nunocoracao/blowfish)（Git 子模块） |
| 自定义布局 | Hugo 模板（`layouts/`） |
| 自定义样式 | CSS 变量 + 毛玻璃仪表盘主题（`assets/css/custom.css`） |
| 前端脚本 | 原生 JavaScript（`assets/js/homepage-live.js`） |
| 数据配置 | YAML（`data/home.yaml`） |
| 实时数据代理 | Cloudflare Workers（单独管理，不在本仓库中） |
| 评论系统 | [Giscus](https://giscus.app/) |
| CI/CD | GitHub Actions |
| 托管 | GitHub Pages |

## 项目结构

```
.
├── archetypes/              # Hugo 内容模板
├── assets/
│   ├── css/custom.css       # 自定义全局样式（仪表盘主题）
│   ├── img/avatar.jpg       # 头像
│   └── js/homepage-live.js  # 前端动态数据加载脚本
├── config/_default/
│   ├── hugo.toml            # Hugo 站点配置（主题、URL、分页等）
│   ├── languages.zh-cn.toml # 语言配置（作者信息、社交链接）
│   ├── markup.toml          # Markdown 渲染配置
│   ├── menus.zh-cn.toml     # 导航菜单
│   └── params.toml          # 主题参数（外观、布局、文章列表等）
├── data/
│   └── home.yaml            # 首页数据模型（个人信息、天气、GitHub、Steam、RSS、评论等配置）
├── layouts/                 # 自定义 Hugo 布局覆盖
│   ├── activity/list.html   # 动态页面（GitHub 事件 + RSS 双栏布局）
│   ├── posts/list.html      # 帖子列表页面
│   └── partials/
│       ├── home/custom.html # 首页仪表盘布局（侧边栏 + 主内容区）
│       ├── site-dock.html   # 顶部导航栏
│       ├── site-footer.html # 统一页脚
│       └── header/          # 自定义头部菜单组件
├── themes/blowfish/         # Blowfish 主题（Git 子模块）
├── .github/workflows/
│   └── hugo.yaml            # CI/CD：构建并部署到 GitHub Pages
├── hugo.toml                # Hugo 根配置
└── .gitmodules              # 子模块定义
```

## 数据流与实时更新

站点的实时数据通过 **Cloudflare Workers** 代理获取，Worker 脚本单独在 Cloudflare Dashboard 管理。前端 JS 在页面加载时向 Worker 端点发起请求：

```
┌──────────────┐     ┌────────────────────┐     ┌─────────────────┐
│  前端 JS      │────▶│  Cloudflare Workers │────▶│  第三方 API       │
│ (homepage-   │     │  (代理 / 聚合)       │     │  GitHub / RSS /  │
│  live.js)    │◀────│                     │◀────│  Steam / Open-   │
│              │     │                     │     │  Meteo           │
└──────────────┘     └────────────────────┘     └─────────────────┘
```

### Worker 端点

| 端点 | 用途 | 配置位置 |
|------|------|----------|
| `workerEventsUrl` | GitHub 公开事件 JSON | `data/home.yaml` → `github.workerEventsUrl` |
| `workerFeedUrl` | 聚合 RSS 订阅 JSON | `data/home.yaml` → `rss.workerFeedUrl` |
| `workerUrl` (Steam) | Steam 状态 JSON | `data/home.yaml` → `steam.workerUrl` |
| `countUrl` (Visitor) | 访客计数 JSON | `data/home.yaml` → `profile.visitorBadge.countUrl` |

### 前端数据加载策略

[homepage-live.js](assets/js/homepage-live.js) 按优先级顺序加载数据：

1. **Worker 优先** — 先请求 Cloudflare Worker 端点（带超时，5-8 秒）
2. **直接回退** — Worker 不可用时直接请求原始 API（如 GitHub Events API、RSS 源），前端侧通过 CORS 代理与多 URL 回退链路保证可用性
3. **页面渲染** — 数据到后立即渲染，失败则显示友好占位提示


## 自定义指南

### 修改个人信息

编辑 [data/home.yaml](data/home.yaml) 中的 `profile` 部分：

- `displayName`、`bio`、`role`、`location`
- `github`（用户名）、`steam`（Steam ID）
- `skills`（技能标签列表）
- `timeline`（时间线条目）

### 修改社交链接

编辑 [config/_default/languages.zh-cn.toml](config/_default/languages.zh-cn.toml) 中 `[params.author]` 下的 `links`。

### 修改导航菜单

编辑 [config/_default/menus.zh-cn.toml](config/_default/menus.zh-cn.toml)。

### 修改 RSS 订阅源

编辑 [data/home.yaml](data/home.yaml) 中的 `externalFeeds` 列表，每条包含 `label`、`category`、`url` 和可选的 `fallbackUrls`。

### 配置 Giscus 评论

1. 在 GitHub 仓库中启用 Discussions
2. 安装 [Giscus GitHub App](https://github.com/apps/giscus)
3. 在 [giscus.app](https://giscus.app/) 配置后获取 `repoId` 和 `categoryId`
4. 填入 [data/home.yaml](data/home.yaml) 的 `comments.giscus` 部分

### 修改主题配色

编辑 [assets/css/custom.css](assets/css/custom.css) 中的 CSS 变量（`:root` 用于日间模式，`:root.theme-night` 用于夜间模式）。

## License

站点内容保留所有权利。代码部分遵循项目所在仓库的许可条款。
