# 新主页重写需求与实施计划

> 2026-11-02：本文件为旧版迁移思路的历史记录。用户已明确要求独立设计 Vercel 新主页，改良原有功能，不要求全部保留或基于旧站重构。当前产品范围、资源决策、实施顺序及验收以 [new-homepage-product-brief.md](new-homepage-product-brief.md) 为准。

## 1. 项目目标

基于当前个人主页的功能，在 Vercel 上使用 Next.js 重写一个更易维护、可扩展、加载更稳定的新主页。

重写目标：

- 保留现有个人主页、博客、动态聚合、实时状态和评论能力。
- 将浏览器端直接访问多个第三方 API 的方式，改为由服务端统一代理、缓存和处理错误。
- 保持文章 URL、图片资源和 Giscus 评论映射的兼容性。
- 使用 Vercel Preview 环境支持持续预览和验收。
- 先完成前台和现有内容发布流程，再逐步替换后台和数据服务。

## 2. 当前功能盘点

### 2.1 首页 Dashboard

当前首页由 `layouts/partials/home/custom.html`、`assets/js/homepage-live.js`、`data/home.yaml` 和 `assets/css/custom.css` 共同实现，包含：

- 头像、昵称、简介、地区、学校、研究方向和技术栈。
- GitHub、邮箱、QQ、Bilibili、X、Steam 社交链接。
- 访客计数和 Visitor Badge 图片回退。
- Steam 在线、离线、游戏中状态。
- Steam 最近游玩游戏和图标。
- Open-Meteo 天气查询和城市切换。
- GitHub Commit 贡献热力图。
- 最近 5 篇帖子。
- Giscus GitHub Discussions 评论区。
- 根据北京时间自动切换日间/夜间主题。
- 桌面端双栏和移动端单栏响应式布局。

### 2.2 帖子系统

当前内容位于 `content/posts/`，使用 Markdown 文件管理，支持：

- 帖子列表和单篇文章页面。
- 标题、日期、摘要、标签和分类。
- 年份归档和分页。
- 文章目录、阅读时间、代码复制和上一页/下一页导航。
- 首页近期帖子展示。

### 2.3 动态页面

当前页面为 `/activity/`，包含两类信息流：

- GitHub 公开动态：Push、Pull Request、Issue、Release、Fork、Watch 等。
- RSS 聚合动态：B 站、番剧、IT 之家、36 氪、财联社等。
- RSS 分类筛选。
- Cloudflare Worker 优先，第三方 API 或 RSS 代理回退。
- 请求超时、空数据和失败提示。

### 2.4 内容管理

当前使用 Decap CMS，入口为 `/admin/`，配置位于 `static/admin/`，支持：

- GitHub OAuth 登录。
- 创建、编辑和发布 Markdown 帖子。
- 图片上传到 `static/img/posts`。
- 直接提交到 GitHub 仓库。

当前 OAuth 代理由 Cloudflare Worker 提供。

## 3. 目标技术方案

### 3.1 推荐技术栈

- Next.js App Router
- TypeScript
- Tailwind CSS
- Vercel Route Handlers
- Vercel Cron
- Markdown 或 MDX 文章
- Giscus 评论
- GitHub 仓库作为文章和配置的版本源

### 3.2 目标目录结构

```text
app/
  page.tsx
  posts/page.tsx
  posts/[slug]/page.tsx
  activity/page.tsx
  api/
    github/events/route.ts
    rss/route.ts
    weather/route.ts
    steam/status/route.ts
    steam/games/route.ts
    visitor/route.ts
components/
lib/
content/
public/
```

### 3.3 数据策略

| 数据 | 目标存储或来源 |
| --- | --- |
| 个人信息、社交链接、技能、时间线 | `content` 或 TypeScript 配置文件 |
| 文章 | Git 仓库中的 Markdown/MDX |
| GitHub 动态 | Vercel API Route Handler + 缓存 |
| RSS 数据 | Vercel API + Cron + 缓存存储 |
| 天气 | Open-Meteo，经 Vercel API 代理 |
| Steam 状态 | 现有 Worker 或 Vercel API |
| 访客计数 | 现有 Worker、Vercel KV 或 Redis |
| 评论 | Giscus + GitHub Discussions |
| 私密 Token | Vercel Environment Variables |

## 4. 接口兼容要求

Cloudflare Worker 源码目前不在当前仓库中。重写开始前，需要从 Cloudflare 控制台导出源码，或提供独立 Worker 仓库，并确认以下接口的请求和响应格式：

```text
GET /github
GET /rss
GET /steam
GET /steam/games
GET /visitor
```

第一阶段先兼容现有接口，避免前台重写和后端迁移同时发生。后续可将简单代理接口迁移为 Vercel Functions；涉及缓存、KV、定时任务或复杂绑定的接口单独评估。

每个新接口必须具备：

- 请求超时控制。
- 缓存策略。
- 失败和空数据响应。
- 统一错误格式。
- 必要的限流和日志。
- 私密 Token 仅在服务端使用。

## 5. 页面与交互需求

### 5.1 首页 `/`

- 顶部导航：首页、帖子、动态、关于或项目。
- Hero 区域：头像、名称、简介、研究方向、社交链接。
- 实时状态：Steam、天气、访客数和最近活动。
- GitHub 区域：贡献热力图和近期公开动态。
- 内容区域：近期帖子、技能标签、个人时间线和精选项目。
- Giscus 评论区延迟加载。
- 支持浅色、深色和北京时间自动主题。
- 移动端优先，第三方数据延迟加载。

### 5.2 帖子 `/posts`

- 帖子列表、摘要、日期、分类和标签。
- 搜索、分类筛选、标签筛选和年份归档。
- 分页或无限滚动，具体方案在实现阶段确定为单一方案。
- 提供 RSS 链接。

### 5.3 文章 `/posts/[slug]`

- Markdown/MDX 渲染。
- 代码高亮和复制。
- 目录、阅读时间和上一篇/下一篇。
- Open Graph 分享信息。
- Giscus 评论。
- 保持现有文章 slug 和路径兼容。

### 5.4 动态 `/activity`

- GitHub 动态时间线。
- RSS 信息流。
- RSS 分类筛选。
- 加载更多或分页。
- 数据源状态、加载中、失败和空状态。
- 显示时间和来源。

### 5.5 管理后台 `/admin`

第一阶段继续兼容 Decap CMS，确保文章发布流程不中断。第二阶段再评估自定义管理后台，可能包括：

- GitHub OAuth。
- Markdown/MDX 编辑器。
- 图片上传。
- 草稿预览。
- 标签和分类管理。
- GitHub Commit 或 Pull Request 发布。

## 6. 实施阶段

### 阶段一：需求冻结和接口盘点

- 冻结首页、帖子、动态和 CMS 的功能边界。
- 导出 Cloudflare Worker 源码或整理接口响应样例。
- 统计现有文章、图片、配置和 URL。
- 确认 Giscus、访客统计、Steam 和 RSS 是否全部保留。
- 产出页面清单、接口契约、环境变量清单和数据迁移清单。

### 阶段二：建立 Next.js 工程

- 初始化 Next.js、TypeScript 和 Tailwind CSS。
- 建立全局布局、设计令牌、响应式断点和主题系统。
- 配置 Vercel Preview 和 Production 环境。
- 配置 SEO metadata、sitemap 和 robots.txt。
- 让首页、帖子页和动态页具备基础路由。

### 阶段三：迁移静态内容

- 迁移个人信息、社交链接、技能和时间线。
- 迁移文章和图片。
- 保持现有文章 slug、图片路径和站点导航。
- 为旧路径建立必要的重定向。

### 阶段四：重写实时数据接口

- 实现 GitHub、RSS、天气、Steam 和访客 API Route Handlers。
- 增加服务端缓存、超时、错误处理和回退。
- 通过 Vercel Cron 刷新适合缓存的数据。
- 将第三方 API Token 移入 Vercel 环境变量。
- 更新 Worker CORS 或逐步替换 Worker 接口。

### 阶段五：重做首页和交互

- 完成 Hero、状态卡、热力图、近期帖子、时间线和评论区。
- 完成主题切换和响应式布局。
- 增加所有实时组件的加载、错误和空状态。
- 优先保证首屏性能，实时组件延迟加载。

### 阶段六：动态页面和 CMS

- 完成 GitHub 动态时间线。
- 完成 RSS 聚合和筛选。
- 迁移 Decap CMS 配置和 OAuth 回调。
- 验证文章创建、编辑、图片上传和发布流程。

### 阶段七：上线验收

- 使用 Vercel Preview 完成完整回归。
- 检查首页、文章、动态、CMS、Giscus 和所有实时组件。
- 检查桌面端、移动端、慢网络和第三方接口失败场景。
- 检查 Lighthouse、SEO、404、日志和 API 缓存。
- 确认正式域名和所有 OAuth/CORS 白名单后再切换流量。

## 7. 验收标准

### 功能验收

- 首页所有静态内容正确显示。
- GitHub 热力图、动态、天气、Steam 和访客数可正常加载。
- 第三方接口失败时页面仍可使用，并显示明确的占位状态。
- 帖子列表、文章详情、分类、标签和分页正常。
- 文章图片和旧文章 URL 不产生 404。
- RSS 分类筛选正常。
- Giscus 能加载、登录、评论和回复。
- Decap CMS 能登录、编辑文章、上传图片和提交内容。

### 质量验收

- 移动端布局无横向溢出。
- 键盘可以访问导航、筛选和表单控件。
- 页面基础信息具备 title、description、Open Graph 和 canonical。
- 生产环境不暴露 API Token。
- API 具备超时、缓存和错误处理。
- Preview 和 Production 构建均成功。

## 8. 暂定范围和决策

- 第一版使用 Next.js 重写前台，文章继续使用 Git 管理的 Markdown/MDX。
- 第一版继续使用 Giscus，不自行开发评论系统。
- 第一版优先兼容现有 Cloudflare Worker，不强制同时迁移后端。
- 第一版继续使用 Decap CMS，减少内容发布流程变化。
- 保持原文章路径和 Giscus pathname 映射，避免评论关联断裂。
- 自定义 CMS、数据分析、全文搜索和复杂动画放到后续迭代。
- 具体视觉稿、正式域名、缓存服务和 Worker 是否迁移，需要在阶段一确认。

## 9. 开工前待确认事项

1. Cloudflare Worker 源码、绑定资源和环境变量在哪里。
2. 新主页是否继续使用当前域名和文章 URL。
3. 访客统计是否保留现有累计数据。
4. Steam、RSS、天气和 GitHub 动态是否全部保留。
5. 第一版是否继续使用 Decap CMS。
6. 新主页的视觉方向、品牌色和是否保留当前毛玻璃风格。

## 10. 实施记录入口

2026-11-01 已开始 Next.js 静态前台与内容迁移。具体完成项、验证结果和下一阶段任务见 [implementation-progress.md](implementation-progress.md)；接口消费字段草案与内容清单见 [migration-inventory.md](migration-inventory.md)，开发与部署配置见 [nextjs-development.md](nextjs-development.md)。Worker 源码/响应样例暂缺，实时服务和生产切换仍需后续验收。

未闭环事项、域名约束修正、已复现缺陷、所需资源和分批修复验收见 [closure-and-repair-plan.md](closure-and-repair-plan.md)。后续实施同时以该清单跟踪闭环。
