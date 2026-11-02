# 实施进度

**最新实现（2026-11-02）**：新首页、项目/关于页面、GitHub/RSS 实时动态与独立配置已实现。当前交付、测试及部署状态统一记录在 [new-site-delivery.md](new-site-delivery.md)。下文为早期迁移阶段记录。

**内容编辑更新（2026-11-02）**：已按用户要求替换 Decap，站内 Markdown 编辑器在本地通过基础验证；生产推送、登录和图片端到端验收待完成。详见 [生产部署记录](production-deployment.md)。

> 2026-11-02 方向更新：下文记录的是已有工程工作及旧版迁移验收，不能据此推断新产品已完成。当前需求是独立设计 Vercel 新站并改良原有场景，不要求全部旧功能兼容；新的实施主线见 [产品基线](new-homepage-product-brief.md)。

更新：2026-11-01。以 `homepage-rewrite-plan.md` 为需求基线。

## 当前交付

- [x] 阶段一：页面、内容、URL、第三方依赖、环境变量和 Worker 前端消费字段盘点。
- [ ] 阶段一：取得真实 Worker 响应契约和资源绑定；用户已确认暂无源码/样例。
- [x] 阶段二：Next.js、TypeScript、Tailwind、全局布局、主题、基础路由、metadata、sitemap、robots、构建配置。
- [ ] 阶段二：创建真实 Vercel Preview / Production 环境并验收。
- [x] 阶段三：复用个人信息、社交链接、技能、时间线、3 篇文章及 5 张正文图片；保留原路径。
- [x] 文章增强：摘要搜索、分类/标签/年份筛选、每页 6 篇、目录、阅读时间、高亮复制、相邻文章、RSS。
- [x] 评论基础：Giscus 原仓库与 pathname 映射、按需加载、超时失败提示和主题联动。
- [x] CMS 基础：保留 Decap 原文件、文章/上传目录和 OAuth 代理配置，`/admin/` 可访问。
- [x] 动态基础：`/activity/` 路由、GitHub 和 RSS 真实来源入口。
- [ ] 阶段四：实时 Route Handlers、缓存、限流、日志、Cron。
- [ ] 阶段五：天气、Steam、访客、近期动态等实时卡片接入及完整首页验收。
- [ ] 阶段六：GitHub/RSS 聚合流、分页/分类、CMS 真实登录和发布验证。
- [ ] 阶段七：Vercel 回归、Lighthouse、真实评论/登录、正式域名切换。

## 验证记录

| 检查 | 本地结果 |
| --- | --- |
| `npm run lint` | 通过，无警告 |
| `npm run typecheck` | 通过，包含生成 Next.js 路由类型 |
| `npm test` | 6 项通过：URL、草稿/未来文章、组合筛选/分页、构建时间一致性、Markdown 安全渲染、现有文章/图片引用 |
| `npm run build` | 生产配置构建通过，3 个文章详情页预生成 |
| `VERCEL_ENV=preview` 构建 | 本地通过，额外检查首页 noindex/nofollow、robots 禁止抓取、sitemap 无 URL |
| `npm run test:e2e` | 已安装 Chrome 上 4 项通过：故障降级/主题、搜索/目录/旧 URL、CMS/资源/SEO/RSS/404、移动端/键盘 |
| 截图检查 | 1440px 桌面与 375px 手机布局已检查；浅/深主题均已查看；无横向溢出 |
| 内容跟踪 | 已确认 Next.js 服务端输出追踪包含 Markdown 文件和首页 YAML，可随函数打包 |

测试使用阻断第三方请求验证降级，没有将模拟数据当成真实服务接入。初次内容测试误把 5 张静态资源视为 5 处正文引用，已按实际 4 处引用修正，并单独检查未引用历史图片仍返回 200。

Windows 沙箱限制了 tsx 用户信息读取及 Playwright 测试服务清理；相应测试获准在沙箱外运行并正常退出。Next.js 提示旧 `static/` 目录已弃用，该目录暂为 Hugo/Decap 编辑源保留，Next.js 使用构建前复制到 `public/` 的资源。

真实 Worker、Giscus 登录评论、Decap OAuth/发布与 Vercel 线上 Preview/Production 验收仍未完成。没有部署或切换生产流量。

## 下一项可独立推进的任务

2026-11-01 复核发现旧标签筛选回显问题（已复现），并补充资源同步、测试夹具及目录 id 审查任务。优先修复这些本地缺口，再实现不依赖 Worker 的天气代理和城市卡片。完整依赖、所需资源与分批验收见 [未闭环事项与后续修复计划](closure-and-repair-plan.md)。

正式域名方案也需修正：`rukiaovo.github.io` 不能由用户直接修改 DNS 指向 Vercel；现有 canonical 只是兼容占位。选择自有域名或 Vercel 域名后再安排旧站过渡，不能将“保留文章路径”视为“原 hostname 可直接切换”。
