# 新站实现与交付记录

更新：2026-11-02。当前产品基线为 `new-homepage-product-brief.md`，本记录不以旧站功能逐项复刻为目标。

## 最新布局调整

用户补充要求风格与旧主页相似后，已将本地新站改为蓝灰色 GitHub Profile 仪表盘：浮动导航、左侧头像/资料/技能、右侧热力图/文章/项目/动态/留言；手机单列。工作台提供 Decap CMS OAuth 接入和 GitHub 网页备用写作/图片上传入口。相关边界及 ClouDNS 官方接入依据见 [layout-publishing-domain.md](layout-publishing-domain.md)。

此轮生产构建、lint、类型检查及 6 项浏览器回归通过，覆盖 320/375/768/1440px 无溢出。当前布局在本地 3200 预览；下文临时部署记录对应上一轮视觉版本，不代表新布局已重新上线。

## 本轮实现

- 首页重新设计为个人介绍、精选项目、近期文章、开发足迹、联系入口。暖白/深绿视觉、项目示意图和独立移动布局；热力图和留言移到关于页，减轻首页信息密度。
- 新增 `/projects/` 和 `/about/`。项目采用已核对的公开仓库 Kg4se 与个人站点，不添加虚构经历或指标。
- 新站独立配置为 `data/site.ts`，不再读取 Hugo `data/home.yaml`，旧 Hugo 模板、JS 和配置不参与新页面渲染。
- `/activity/` 展示 GitHub 公开事件和 RSS 内容。RSS 首版来源为 IT之家、GitHub Blog、Hacker News，提供来源筛选、加载更多、去重、时间、部分失败提示、空状态及重试。
- `/api/activity/?kind=github|rss` 通过固定上游列表获取数据，参数不能指定任意 URL。响应统一为 `ok/data/error/requestId`；失败响应不缓存。
- 外部请求包含 7 秒超时、2 MB 响应上限、结构校验和协议限制。XML 禁止文档级 DTD/实体声明，但允许 CDATA 中的 HTML 示例，输出仅作为文本显示。
- GitHub 缓存 5 分钟、RSS 缓存 15 分钟，使用 Next.js Data Cache 按需更新。API 响应有短期 CDN 缓存；只缓存经验证的成功快照。数据源状态展示上次获取时间。
- API 设置每分钟 60 次的实例内限流；可通过 Upstash REST 环境变量切换成共享原子计数。未配置共享存储时不声称实现了跨实例限流。配置后存储异常会返回 503，不默默绕过。
- `/admin/` 支持 Decap CMS 与 GitHub OAuth；缺少完整配置时退回 Markdown/Git 发布工作台。回调校验 state 和目标仓库 push 权限；popup 消息协议、安全响应头及分支链接均有自动化覆盖。
- Next.js 使用 beforeFiles rewrite 将 `/admin/config.yml` 指向动态 CMS 配置，避免 Hugo 遗留的 `static/admin/config.yml` 覆盖新路由。
- 资源同步只管理图片，通过清单删除失效的受管文件，不删除不相关文件；构建拒绝 Hugo 的 `public/index.html` 冲突。
- canonical 使用 `SITE_URL` 或 Vercel 生产域名，本地使用 localhost。临时预览可设置 `SITE_NOINDEX=true`。

## 验证

- 生产构建、lint、TypeScript 通过。
- 14 项单元测试通过：文章处理、筛选、目录锚点、资源同步、GitHub/RSS 校验、安全链接、去重、空数据、上游超时/错误/大小限制。
- 6 项浏览器回归通过：导航与内容、主题持久化、第三方失败降级、文章/资源/SEO、RSS 来源筛选及分页、请求失败重试。
- 本轮 CMS 补充：15 项单测、lint、类型检查、生产构建通过；6 项浏览器回归在未配置与临时测试配置两种路径通过。OAuth 客户端/密钥未创建，未进行真实 GitHub 写入。
- 在 320、375、768、1440px 检查主要页面，无横向溢出；已查看桌面/手机首页截图。
- Vercel 真实 API 返回 GitHub 9 条公开活动、RSS 90 条内容；IT之家、GitHub Blog、Hacker News 三个来源均成功。GitHub Blog 的 CDATA 示例解析问题已修复并覆盖回归。
- 浏览器自动测试对失败、空、部分失败等使用夹具；真实上游读取另行执行，不混淆模拟成功与真实成功。

## 部署与尚未验证项

- 官方 CLI 65.9.0 已完成匿名临时部署：<https://brisk-sulfur-lttgsfc.tmp.now>。服务端报告到期时间为 **2026-11-02 01:57:13（北京时间）**。这不是长期生产域名；到期后需认领或重新部署。
- 最终线上检查：首页、文章列表/搜索/详情、项目、关于、动态、内容工作台、图片、RSS、robots、sitemap 均为 200；不存在页面为 404、无效 API 查询为 400。Chrome 实际完成搜索→文章跳转，核对 canonical/noindex 和正文图片，375px 无横向溢出、无脚本错误。
- 临时站开启 `SITE_NOINDEX=true`，canonical 指向实际临时域名，robots 禁止抓取。桌面/手机/深色及真实动态截图保存在 `test-results/vercel-*.png`，探测摘要在 `test-results/vercel-smoke.json`（均为本地忽略产物）。
- 当前机器的系统代理路径访问临时域名返回 403；Chrome 使用进程级 `--no-proxy-server` 后线上端到端通过。未修改系统代理设置。用户浏览器如遇同样问题，应检查代理路径，或使用本地预览。
- Windows 本地 Vercel 构建存在 Path/PATH 重复、目录链接反斜线、App Router trace 路径不匹配的问题。本次部署规范化进程 PATH/生成链接，并将 Next.js 实际 trace 的依赖恢复到生成的函数文件映射。诊断与辅助脚本保留在被忽略的 `.vercel/`，不含在公开站点源文件中。
- 项目构建使用 `next build --webpack`；配置显式追踪 Markdown 内容。长期发布推荐 Vercel Git 集成的 Linux 构建，不依赖本次 Windows 临时产物修补。
- 临时部署即使成功，也不等于账号名下的长期生产项目或 Git 集成已建立；需登录并认领/创建长期项目后配置生产分支。
- Giscus 的脚本、仓库及 pathname 配置保留，但真实登录、评论写入和回复尚未验证。请求失败时有超时、重试和 GitHub Discussions 入口。
- GitHub OAuth 使用 `public_repo` 权限；用户应核对 GitHub 同意页的授权范围。回调拒绝对目标站点仓库无 push 权限的用户。
- Upstash 共享限流尚无账号资源，不能标为已上线验证。
- `npm audit --omit=dev` 为 0 个已知漏洞；完整安装报告的 16 个 moderate 属开发依赖，未进行破坏性的强制升级。
- Cron 未配置：当前三个订阅源按请求缓存更新，首版不需要先搭建定时任务来展示内容。
- 自动定时发文、天气、Steam、访客分析属于后续可选增强，不是当前页面中的假数据组件。

## 开发和发布

使用 Node.js 24：`npm ci`，然后 `npm run dev`。发布检查为 `npm run lint`、`npm run typecheck`、`npm test`、`npm run build` 和 `npm run test:e2e`。

Vercel Root Directory 为仓库根目录，框架 Next.js，安装 `npm ci`，构建 `npm run build`，不配置 Hugo 的 `public` 为输出目录。`.vercelignore` 排除旧 Hugo 实现、文档、测试产物和本地环境文件。

内容编辑位置：个人信息/项目在 `data/site.ts`；文章在 `content/posts`；正文图片在 `static/img/posts`；头像在 `assets/img/avatar.jpg`。新页面不需要 Worker Token。可选 `GITHUB_TOKEN` 仅在服务器请求 GitHub 时使用。

旧 Hugo/Pages 发布流程继续保留供旧站使用。新站合并/发布到仓库前，应明确 GitHub Pages 和 Vercel 各自的生产分支，避免把一次内容提交的双站更新误认为单站发布。
