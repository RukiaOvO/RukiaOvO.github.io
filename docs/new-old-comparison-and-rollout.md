# 新旧主页对比与部署配置流程

更新：2026-11-02。按当前本地代码核对；“旧站”表示仓库中的 Hugo 实现/配置，不代表本轮重新验证了所有旧外部服务。

部署进度更新：`codex/vercel-site` 已推送，个人 Vercel 项目为 `rukiaovo-homepage`，生产地址为 https://rukiaovo-homepage.vercel.app，仓库生产集成与 OAuth App 已配置。新版 Markdown 编辑器已部署；提交 `594afe1` 修复开放的旧 Decap 文章草稿无法在新版打开的问题。真实账号的生产文章读取、保存和图片显示仍待用户复核，详见[生产部署记录](production-deployment.md)。

## 当前交付边界

- 新站当前是与旧主页相近的蓝灰色、半透明卡片、侧栏与主栏布局，已在本地构建并通过浏览器回归。
- 新站源码已推送到 `codex/vercel-site`，并由 Vercel 生产项目自动部署；旧站仍使用 `main`。
- `/admin/` 已从 Decap CMS 切换到站内 Markdown 编辑器：图片直接上传并插入正文，新文章和图片保存在同一文章草稿 PR。现存 `cms/posts/<slug>` 文章 PR 可在新版打开并继续更新；旧 PR 不会自动合并或删除。

## 新旧对比

| 项目 | 旧站 Hugo / GitHub Pages | 新站 Next.js / Vercel 当前状态 |
| --- | --- | --- |
| 工程与托管 | Hugo + Blowfish；GitHub Actions 发布到 Pages | 独立 Next.js App Router / TypeScript / Tailwind；Vercel 生产项目已连接 `codex/vercel-site` |
| 视觉与结构 | 蓝灰配色、玻璃卡片、顶部导航、个人资料侧栏、功能主栏 | 延续相同视觉方向；桌面双栏、手机单列；生产站已部署 |
| 首页重点 | 头像资料、热力图、Steam/天气、近期文章、留言 | 头像资料、热力图、近期文章、精选项目、GitHub 活动、留言；主栏按内容分区 |
| 导航与独立页 | 首页、帖子、动态 | 首页、文章、项目、动态、关于；页脚/侧栏有写作入口 |
| 资料和配置 | `data/home.yaml` 与 Hugo TOML | `data/site.ts` 独立维护个人资料、社交链接、项目、主题相关配置 |
| 文章与图片 | Markdown，图片在 `static/img/posts` | 复用 3 篇文章和已有图片；同步到 Next.js public；延续现有文章路径 |
| 阅读与发现 | Hugo 文章、分类标签、分页 | 标题/摘要/分类/标签搜索，组合筛选、年份、分页、目录、代码高亮/复制；不是全文检索 |
| 项目与经历 | 简介、技能、时间线配置 | 增加项目页与关于页；主页精选项目，较长介绍/时间线放关于页 |
| 主题 | 北京时间日夜规则 | 北京时间自动模式 + 手动浅/深色；保存用户选择 |
| GitHub 热力图 | 外部图片服务，首页展示 | 同类服务，首页和关于页展示；有加载超时/失败降级 |
| GitHub 活动 | 旧 Worker 代理与前端回退 | Vercel 服务端直接读公开 API；首页摘要、动态页完整列表；已实测 |
| RSS | 配置 B站动态、番剧、IT之家、36氪、财联社及备用源 | IT之家、GitHub Blog、Hacker News 三源已实测；来源筛选、去重、加载更多、部分失败提示；未复刻原有娱乐/财经源 |
| 天气 | Open-Meteo、城市切换 | 尚未接入；后续可放侧栏 |
| Steam | 在线状态、最近游玩，依赖旧 Worker | 尚未接入；保留个人 Steam 链接，链接不等于实时状态 |
| 访问统计 | 访客徽章/Worker 累计 | 尚未实现统计、没有迁移历史计数；后续可评估 Vercel Analytics |
| 留言与评论 | Giscus / GitHub Discussions | 配置与 pathname 映射沿用；点击加载、主题同步、超时/重试；真实登录发言待验收 |
| 在线写作 | 旧站 Decap 配置和 main 分支 | 新站站内 Markdown 工作台；GitHub OAuth 会话只在服务端；新稿使用 `cms-editor/*` PR，既有 `cms/posts/*` 草稿可继续编辑；真实账号完整验收待完成 |
| 发布链路 | 推送 main 触发 Hugo / Pages | 推送 `codex/vercel-site` 触发 Vercel 生产部署；尚未做回滚演练 |
| 接口可靠性 | 旧 JS / Worker 实现，Worker 源码不在仓库 | 明确响应格式、参数白名单、7秒上游超时、响应大小限制、成功缓存、实例内限流；共享限流可选 |
| 域名 | 当前 GitHub Pages 地址；平台也支持自定义域名 | 长期 vercel.app 或 ClouDNS 管理的自定义域名；不把 github.io 子域名迁到 Vercel |
| SEO | Hugo 输出 metadata、RSS 等 | canonical、RSS、sitemap、robots；Preview 默认 noindex；正式域名需上线后复核 |

## 推荐发布分支方案

过渡期使用同一仓库的独立生产分支，例如 `codex/vercel-site`。旧站继续从 `main` 发布，新站 Vercel 绑定独立分支；未来功能或内容变更通过短期分支 PR 合并到新站生产分支。

执行前必须处理两个当前事实：

1. 新站 `/admin/` 使用站内工作台，Pull Request base 为 `codex/vercel-site`；Vercel 生产项目继续绑定该分支，旧 Hugo workflow 只监听 `main`。
2. 新 `.github/workflows/nextjs.yml` 仅监听 `codex/vercel-site`，因此旧 Pages 部署不会接管新站代码。

这是后续实施方案，本次整理没有创建/切换分支、提交、推送或修改线上配置。两分支在后续独立演进时，内容不会自动同步；需要双站同时更新时应明确安排同步。

## 步骤 1：准备账号和源码

- 用户在浏览器登录 GitHub、Vercel 和 ClouDNS；Vercel 授权访问 `RukiaOvO/RukiaOvO.github.io`。
- Vercel 项目名候选为 `rukiaovo-homepage`，默认域名候选为 `rukiaovo-homepage.vercel.app`；在账号内确认可用后作为 OAuth 测试和初期生产域名。之后再决定是否加 ClouDNS 自有域名。
- 创建新站生产分支，保存当前新工程、更新发布分支相关配置；不要把 `.env.local`、`.vercel/` 凭据、node_modules 或构建产物提交到仓库。
- 检查 lint、typecheck、单元测试、生产构建和浏览器回归后提交并推送。需要评审时在独立变更分支创建 PR。
- 退出条件：GitHub 上能看到最新布局源码、文章和 CI；旧 main / Pages 的发布边界清晰。

## 步骤 2：建立长期 Vercel 项目

在 Vercel 导入仓库；已有且仍可认领的临时项目也可认领，但仍需连接 Git 仓库。建议使用 Vercel Linux 云端构建，避免依赖此前 Windows CLI 临时产物修补。

| 设置 | 值 |
| --- | --- |
| Framework Preset | Next.js |
| Root Directory | 仓库根目录 |
| Node.js | 24.x |
| Install Command | `npm ci` |
| Build Command | `npm run build` |
| Output Directory | 框架默认，不填 Hugo 的 public，也不使用静态 export |
| Production Branch | 前一步选定的新站生产分支 |

首次导入可能创建一次生产部署；在选定分支和上线验收完成前，将其视为待验收站点，保持 `SITE_NOINDEX=true`。若界面首次默认使用 main，先在项目 Git 设置选定新站生产分支，再从该分支重新部署。

退出条件：最新源码在账号名下的稳定 vercel.app 地址构建成功并能访问。后续短期分支自动生成 Preview；如访问需要 Vercel 登录，核对 Deployment Protection 设置与分享对象。

## 步骤 3：环境变量

| 变量 | 初次配置 | 正式上线 |
| --- | --- | --- |
| `SITE_URL` | 没有自定义域名时可不填，自动用 Vercel 生产域名；不要复制 localhost 值 | 设置为最终 `https://完整域名`，不带路径、查询串；Production 与 Preview 的 canonical 可统一指向生产域名 |
| `SITE_NOINDEX` | 待验收生产部署设为 `true` | 正式 Production 删除或设为 `false`；Preview 仍由 `VERCEL_ENV=preview` 自动禁止索引 |
| `GITHUB_TOKEN` | 可不填；公开动态已可使用 | 遇到共享出口配额限制时再添加，服务端使用 |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | 可不填 | 需要共享限流时成对配置并验证；未配置只有实例内限制 |
| `GITHUB_OAUTH_CLIENT_ID` | 创建 GitHub OAuth App 后设 Production | OAuth App Client ID；不设置为 `NEXT_PUBLIC_*` |
| `GITHUB_OAUTH_CLIENT_SECRET` | 创建 GitHub OAuth App 后设 Production | Client Secret，只输入 Vercel 环境变量界面，不发聊天、不提交代码 |
| `CMS_OAUTH_BASE_URL` | 项目域名确认后设 Production | 仅 origin，例如 `https://rukiaovo-homepage.vercel.app`，末尾不带斜杠 |
| `CMS_OAUTH_REDIRECT_URI` | 同上 | 完整回调：`https://rukiaovo-homepage.vercel.app/api/auth/callback?provider=github` |

不需要旧 Worker Token，也不要手动覆盖 Vercel 的平台系统变量。正式域名变更后要同时更新 OAuth App callback 和上述两个 URL，再重新部署并从 `/admin/` 验证。

GitHub OAuth App 配置：Homepage URL 填 Vercel 生产源，Authorization callback URL 与 `CMS_OAUTH_REDIRECT_URI` 完全一致。不要把 Preview 域名作为 OAuth 回调，避免每个临时 Preview 都需要单独登记。账号内完成后，登录编辑器会在 `/admin/` 加载；没有变量时此页仍提供 GitHub 网页写作入口。

## 步骤 4：验收默认域名

1. 打开首页、文章列表/搜索/详情、项目、动态、关于、写作入口；确认是最新仪表盘布局。
2. 检查正文图片、头像、目录跳转、主题持久化、手机无横向溢出、键盘导航。
3. 请求 `/api/activity/?kind=github` 与 `/api/activity/?kind=rss`，确认真实 JSON 数据与来源状态；检查无效参数返回 400、第三方失败不阻塞页面。
4. 检查文章 RSS、404、canonical；待验收站点维持 noindex。
5. 建立一个后续变更 PR，检查 CI、Vercel Preview 和权限，再合并到选定生产分支，验证 Production 自动更新。

## 步骤 5：绑定 ClouDNS 域名

1. 在 Vercel → 项目 → Domains 添加实际域名。
2. 到 ClouDNS 的对应 DNS 区域，按 Vercel 提示添加记录：普通子域名通常 CNAME；根域名按项目提示配置 A。目标值以当前 Vercel 项目为准，不使用临时部署 URL、不照抄其他项目地址。
3. 关闭网站记录的 DDNS 自动更新；移除同主机名上冲突的 A/AAAA/CNAME，保留其他用途的邮件等记录。
4. Vercel 若要求 TXT 验证，按完整记录名与值添加。免费共享子域名可能缺少添加所需验证记录的权限；这种情况下需换可管理域名或暂用 vercel.app。
5. 等待实际 DNS 生效，确认 Vercel 域名状态及 HTTPS 证书正常。不要仅按等待分钟数判断完成。
6. 设置最终 `SITE_URL`，取消 Production 的临时 noindex，重新部署；复核 canonical、RSS、sitemap 与 robots。

ClouDNS 的职责是解析域名；Vercel 的职责是托管网站。无需家中服务器、公网固定 IP、端口转发或动态 IP 更新客户端。

## 步骤 6：在线写作、图片与发布

新版工作台使用现有 GitHub OAuth App 和 Production Secret，不需要创建新应用或再次填写密钥。回调仍为 `https://rukiaovo-homepage.vercel.app/api/auth/callback?provider=github`。代码推送并部署后：

1. 打开 `/admin/` 并使用 GitHub 登录。
2. 新建文章，填写标题、日期、摘要和正文；草稿复选框默认打开。
3. 点击“上传并插入图片”。图片上传后自动插入 Markdown；新文章和图片写进同一 `cms-editor/*` 分支。
4. 保存后从编辑器打开草稿 PR，核对 `content/posts/*.md` 与 `static/img/posts/*` 都在同一个 PR，正文引用 `/img/posts/<唯一文件名>`。
5. 合并 PR 后确认 Vercel 生产文章和图片路径均正常。不要对现有 Decap PR 做任何自动合并或关闭。

本地回归已覆盖同一个模拟 PR 中的 Markdown 和 PNG 提交、图片引用插入、OAuth state/HttpOnly Cookie、同源校验和上传 MIME 检查；线上真实 GitHub 写入与图片展示待部署后确认。

## 步骤 7：评论与可选服务

- Giscus：核对仓库 Discussions、Giscus App 安装与授权；确认 `data/site.ts` 的 repo/category IDs。检查旧 `.giscus.json` 等来源限制（若有）是否允许新域名。首页与文章需实际加载线程；登录、评论和回复使用明确指定的测试讨论验收。
- Upstash：若启用，检查跨请求/实例额度、429 和存储不可用时 503；不是首版展示文章的前提。
- 天气、Steam、旧 RSS 源、访问分析：分项决定数据源与权限后接入，不把这些未实现功能标记为部署配置已经解决。

## 步骤 8：上线与回滚

- 正式域名、HTTPS、SEO、页面与真实 API 验收通过后，记录上线 commit、deployment ID、域名和环境变量名称。
- 旧站在过渡期保留；若要改入口/跳转，另行明确，避免同时把两站当唯一正式站。
- 应用故障可回到上一个已验证的 Vercel 部署；Git 源码同步 revert，避免下一次自动部署再次引入故障。首次上线只有一个成功版本时，不声称已有经过验证的回滚目标。
- DNS 回退与应用版本回退分别处理；修改 DNS 前记录原值。

## 当前还需要用户提供/完成的事项

1. GitHub 与 Vercel 账号登录和仓库访问授权；不能由代码准备代替账号会话。
2. 实际拟绑定的完整域名与 ClouDNS 对应区域管理权限。
3. 实施站内 CMS 时创建/授权 GitHub OAuth App；实施评论写入验收时指定测试账号与讨论。

官方依据：

- [Vercel 添加域名](https://vercel.com/docs/domains/working-with-domains/add-a-domain)
- [ClouDNS CNAME](https://www.cloudns.net/wiki/article/13/)
- [ClouDNS DDNS](https://www.cloudns.net/dynamic-dns/)

相关实现与验证：[new-site-delivery.md](new-site-delivery.md)、[layout-publishing-domain.md](layout-publishing-domain.md)。
