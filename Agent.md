# 新主页重写 Agent 工作说明

> 2026-11-02 方向更新：用户要求设计并开发新的 Vercel 主页，改良原有场景，不要求保留全部旧功能，也不要求在旧站代码上重构。当前实施基线为 [`docs/new-homepage-product-brief.md`](docs/new-homepage-product-brief.md)。以下旧版迁移要求仅供历史参考；与新基线冲突的兼容、Worker 前置条件及验收要求不再生效。

## 项目目标

本项目不再执行 Hugo 到 Vercel 的原样迁移，而是基于现有功能，在 Vercel 上使用 Next.js 重写个人主页。

完整需求、功能盘点、阶段计划和验收标准见：

- [`docs/homepage-rewrite-plan.md`](docs/homepage-rewrite-plan.md)

后续 Agent 开始工作前必须先阅读该文档，并以它作为实施基线。

## 当前系统基线

当前仓库是 Hugo + Blowfish 个人主页，已有以下能力：

- 首页个人资料、社交链接、技能、时间线和访客计数。
- GitHub 贡献热力图和公开动态。
- Steam 在线状态和最近游玩游戏。
- Open-Meteo 天气和城市切换。
- RSS 聚合、分类筛选和备用源。
- Markdown 帖子、列表、归档、分页和文章详情。
- Giscus GitHub Discussions 评论。
- Decap CMS，通过 GitHub OAuth 编辑和发布文章。
- 北京时间日夜主题和响应式布局。

现有 Cloudflare Worker 源码不在本仓库中，但页面依赖以下接口：

```text
GET /github
GET /rss
GET /steam
GET /steam/games
GET /visitor
```

开始后端重写前，应先取得 Worker 源码或接口响应契约。

## 目标技术方向

- Next.js App Router
- TypeScript
- Tailwind CSS
- Vercel Route Handlers
- Vercel Cron
- Markdown 或 MDX 文章
- Giscus 评论
- GitHub 仓库作为文章和配置的版本源

目标页面：

- `/`：个人主页 Dashboard
- `/posts`：文章列表、搜索、标签、分类和归档
- `/posts/[slug]`：文章详情
- `/activity`：GitHub 和 RSS 动态
- `/admin`：第一阶段继续兼容 Decap CMS

## 实施原则

1. 先做 Next.js 新前台，不直接修改现有 Hugo 页面作为重写替代品。
2. 保持文章 slug、文章 URL、图片路径和 Giscus pathname 映射兼容。
3. 第一阶段继续使用 Markdown/MDX 和 Git 版本管理文章。
4. 第一阶段继续使用 Giscus 和 Decap CMS，避免同时重做评论与内容管理。
5. 第三方 API 优先通过 Vercel 服务端代理，不能把私密 Token 放到浏览器端。
6. 每个实时组件都必须有加载中、失败、空数据和超时状态。
7. 实时接口应具备缓存、限流、错误日志和明确的响应格式。
8. 先完成静态内容和核心页面，再加入复杂动画、数据分析和自定义 CMS。
9. 不要在未确认接口契约前删除或替换现有 Worker 依赖。
10. 使用 Vercel Preview 完成回归后，再切换正式域名或生产流量。

## 推荐实施顺序

1. 盘点 Worker 源码、环境变量和接口响应。
2. 建立 Next.js 工程、全局布局、主题和路由。
3. 迁移个人信息、文章、图片和导航。
4. 实现 GitHub、RSS、天气、Steam 和访客的 Route Handlers。
5. 重做首页 Dashboard 和响应式交互。
6. 完成动态页面和 Decap CMS 兼容。
7. 进行功能、移动端、性能、SEO、API 错误和第三方服务回归。

## 验收重点

- 首页、文章、动态和后台路由均可访问。
- 现有文章和图片不产生 404。
- GitHub、RSS、天气、Steam、访客统计和 Giscus 可用。
- 第三方服务失败时页面仍可阅读。
- 移动端无横向溢出，键盘可访问主要控件。
- SEO metadata、sitemap、robots.txt 和 canonical 正确。
- 生产环境不暴露 Token。
- Preview 和 Production 构建均成功。
