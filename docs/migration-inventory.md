# Next.js 迁移盘点

> 2026-11-02：本文件仅作为旧站资源与场景参考，不再要求逐项迁移。用户最新方向是改良功能、独立设计 Vercel 新主页；以 [产品基线](new-homepage-product-brief.md) 为准。

更新：2026-11-01。实施基线为 [homepage-rewrite-plan.md](homepage-rewrite-plan.md) 和根目录 `Agent.md`。

## 本轮边界与决策

- 已确认：Worker 源码和响应样例暂无。下面的接口形状只由旧前端消费代码推断，**不是已验证的服务端契约**。
- 暂以现有域名作为 canonical 占位，保留带尾斜杠的文章路径、现有 Giscus 仓库及 `pathname` 映射。`github.io` 子域名不能由用户将 DNS 直接指向 Vercel，正式域名与旧站过渡方案仍需决定，详见 [闭环计划 D01](closure-and-repair-plan.md)。尚不切换生产流量。
- 保留 `data/home.yaml`、`content/posts`、`static/admin` 和 `static/img/posts` 为唯一编辑源；Next.js 构建前复制静态资源至忽略的 `public/`。
- 视觉沿用轻毛玻璃、双栏信息卡，加入浅绿配色；提供浅色、深色、北京时间自动外观（06:00–18:00 为浅色）。
- 第一轮交付静态前台和文章系统。Steam、天气、访客、动态聚合 API、Cron 及缓存服务仍属于后续阶段。首页暂不呈现这些未经接入的状态卡；动态页明确提示未接入并提供真实来源入口。
- 不迁移或重置访客累计数据，不调整旧 Worker 或 OAuth 配置，不删除原 Hugo 系统。

## 页面及内容迁移清单

| 旧内容或路径 | 新前台处理 |
| --- | --- |
| `/` | 个人信息、6 个社交入口、技能、时间线、近期文章、GitHub 热力图、按需 Giscus |
| `/posts/` | 搜索标题/摘要/标签/分类；组合标签、分类、年份筛选；每页 6 篇 |
| `/posts/[文件名]/` | 使用原 Markdown 文件名作为 slug，不从标题或发布日期重新生成 |
| `/posts/page/N/` | 永久重定向至 `/posts/?page=N` |
| `/tags/`、`/categories/` | 永久重定向至 `/posts/` |
| `/tags/[term]/`、`/categories/[term]/` | 永久重定向至对应筛选；大小写不敏感匹配 |
| `/activity/` | 基础路由、GitHub 入口、5 个现有 RSS 订阅源；聚合流待实现 |
| `/admin/` | 内部 rewrite 至原 Decap `index.html`；原配置、OAuth 代理、文章目录与上传目录不变 |
| `/img/posts/*` | 原路径复制，无 Markdown 图片链接改动 |
| `/img/avatar.jpg` | 从 `assets/img/avatar.jpg` 同步 |
| `/posts/index.xml` | 新增文章摘要 RSS，复用原站常用订阅路径 |
| `/sitemap.xml`、`/robots.txt` | Next.js metadata routes；Vercel Preview 禁止索引 |

现有已发布文章（3 篇）：

1. `/posts/2026-07-01-agentspec-customizable-runtime-enforcement-for-safe-and-reliable-llm-agents/`，实际发布日期 2026-07-05。
2. `/posts/2026-07-01-self-adaptation-through-incremental-generative-model-transformations-at-runtime/`，实际发布日期 2026-07-03。
3. `/posts/2026-07-01-extracting-conceptual-knowledge-to-locate-software-issues/`，实际发布日期 2026-07-01。

正文图片资源（5 张）：`agentspec-fig1.png`、`agentspec-fig4.png`、`self-adaptation-fig2.png`、`self-adaptation-fig3.png`、`self-adaptation-fig5.png`。其中前 4 张被当前正文引用，`fig5` 仍保留以兼容历史外链。文章标题和日期与文件名并不一致，必须保留文件名 URL。首页已有 Giscus 关联，新文章页继续使用相同 pathname 规则。

## Worker 消费契约草案（待验证）

当前基础地址见 `data/home.yaml`，OAuth 代理地址见 `static/admin/config.yml`。

| GET 接口 | 旧前端消费的字段 | 已知行为 / 尚待确认 |
| --- | --- | --- |
| `/github` | `{ events: [{ type, repo: { name }, payload, created_at }] }` | Worker 为空或失败时旧前端回退 GitHub public events；新实现应区分合法空列表与失败 |
| `/rss` | `{ items: [{ label, category, title, link, date, description }] }` | 5 个来源、5 个分类（含“全部”）；Worker 缓存、部分失败和时间格式未知 |
| `/steam?t=…` | `{ ok?, personaName, statusText, gameExtraInfo?, onlineState, personaState }` | 旧前端接受 `ok` 或非空 `statusText`，30 秒刷新；枚举、私密资料、错误状态未知 |
| `/steam/games?t=…` | `{ ok: true, games: [{ appid, name, imgIconUrl?, playtime2weeks? }] }` | 时长按分钟换算；空列表代表近两周无记录；Worker 错误契约未知 |
| `/visitor?t=…` | `{ ok: true, count? / visitors? / value? }` | 旧前端每会话读取一次；GET 是否增加计数、去重、KV 持久化、缓存策略均未知，不能无意预取/缓存/轮询 |

统一超时、错误格式、限流、日志、缓存、CORS 和鉴权目前均无法从前端确认。不要把这些草案当成可直接上线的后端实现。未对访客接口进行自动探测，以免影响累计计数。

其他外部依赖：

- Open-Meteo 天气：9 个城市配置在 YAML，可独立实现服务端天气代理。
- GitHub 热力图：继续使用 YAML 中的 `ghchart.rshah.org` 图像服务；延迟加载、失败回退与超时提示，不携带 Token。
- Giscus：复用 repo ID、category ID、`pathname`，用户点击后加载；15 秒超时、重试及 Discussions 入口，主题随页面更新。
- Decap：版本固定为原有 3.14.1；GitHub 后端 `main` 分支；OAuth 成功与否需真实授权后验证。

## 环境变量与外部配置

| 名称或配置 | 本阶段 | 后续处理 |
| --- | --- | --- |
| `SITE_URL` | 可选，默认 `https://rukiaovo.github.io`；仅服务器读取 | 正式域名确认后设置；Preview 仍指向正式 canonical |
| `VERCEL_ENV` | Vercel 自动注入，用于 Preview 禁止索引 | 无需手工配置 |
| `PLAYWRIGHT_CHROME_PATH` | 可选，本地测试使用已安装 Chrome 路径 | CI 默认使用 Playwright Chromium |
| Worker 环境变量 / KV 绑定 | 未知，未读取或迁移 | 获取源码后盘点；不得创建虚构密钥 |
| GitHub / Steam 私密 Token | 静态阶段不需要 | 接口实施后仅使用服务器环境变量 |
| Decap OAuth Origin / callback | 原配置保留 | 确认 Vercel Preview/正式域名白名单及 callback；如需改动，先核对 Worker OAuth 实现 |
| Cron 凭据和缓存存储 | 尚未建立 | 明确配额、存储和刷新语义后配置 |

## 下一阶段入口

1. 获取 Worker 源码或针对 GitHub/RSS/Steam 的脱敏成功、空、失败响应；确认 visitor 的计数副作用与持久化。
2. 确认 Worker OAuth/CORS 白名单和 Vercel 项目配置。OAuth 无法仅凭前台配置保证可用。
3. 实现 Route Handlers、共享响应格式、缓存/限流/日志，再接入实时卡片和动态分页；天气可先独立实施。
4. 接入缓存服务后再建立 Vercel Cron，避免无意义的空定时任务。
5. 完成 Preview 下 Giscus 登录回复、Decap 新建/编辑/上传/发布、真实数据和移动端验收，最后切换正式域名。
