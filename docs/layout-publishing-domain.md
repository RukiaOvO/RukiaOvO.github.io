# 布局、在线写作与 ClouDNS 接入

更新：2026-11-02。本文件补充最新用户要求；布局要求优先于此前杂志式首页方案。

## 布局

新站沿用旧站的视觉与信息结构：蓝灰配色、日夜主题、半透明卡片、顶部浮动导航、左侧个人信息、右侧主功能区。实现仍是独立 Next.js 工程。

- 侧栏：头像、个人简介、社交入口、学校/城市/研究方向、技能和常用入口。
- 主栏：贡献热力图、近期文章、精选项目、公开开发动态、留言。RSS 完整阅读在动态页。
- 手机：个人信息和主内容单列排列，热力图局部横向滚动，文章正文不横向溢出。
- 天气/Steam 等如后续接入：天气和在线状态进入侧栏，最近游玩进入主栏卡片；只在有真实数据实现后显示。

## 在线写作与上传

Vercel 承载网站和服务端接口，本身不提供文章编辑后台。新站 `/admin/` 已准备 Decap CMS：配置 OAuth 环境变量后显示站内编辑器，内容和图片通过 GitHub 写回独立新站分支；未配置时退回 GitHub 网页写作与上传入口。

当前代码配置：文章写入 `content/posts`，图片写入 `static/img/posts`，Decap 使用 editorial workflow 在 `codex/vercel-site` 建立内容变更；Vercel 需绑定该分支后才会生成 Preview/部署。OAuth 回调使用同一生产源下 `/api/auth/callback?provider=github`。OAuth 代码检查 state、GitHub 仓库写权限，并在 callback 中通过同源 `postMessage` 将授权交回 Decap。

尚待完成的是账号配置和真实账号验收：创建 GitHub OAuth App，将 Client Secret 仅保存在 Vercel Production 环境变量；确保登录用户对 `RukiaOvO/RukiaOvO.github.io` 有写权限；将 Vercel 生产分支设为 `codex/vercel-site`。授权使用 GitHub OAuth 的 `public_repo` 权限，GitHub 会按其授权页面说明授予该用户对公开仓库的访问能力；登录前应核对授权范围，并可随时在 GitHub 撤销应用授权。本站额外验证目标仓库是否有 push 权限。访问 token 由服务端交换，短暂交给 Decap 编辑会话，不写入公开页面或仓库；文章和媒体持久保存在 GitHub，而非 Vercel 函数临时文件系统。

准确配置步骤与变量名见 [新旧主页对比与部署流程](new-old-comparison-and-rollout.md)。站内 CMS 验收仍需真实账号完成登录、新建/编辑/图片上传、预览与发布；当前仅完成本地代码和自动化模拟测试。

## ClouDNS 域名

已核对服务商为 <https://www.cloudns.net/>，不是 Cloudflare。ClouDNS 支持普通 DNS 托管与 DDNS。Vercel 可以使用 ClouDNS 管理的域名；Vercel 的网站不需要追踪家庭公网 IP。

接入步骤：

1. 将项目认领/创建到自己的 Vercel 账号，取得长期生产部署。
2. 在 Vercel 项目的 Domains 中添加实际想使用的域名。
3. 在 ClouDNS 添加 Vercel 为该域名显示的记录。子域名一般用 CNAME，根域名一般按提示使用 A；具体目标以当前项目提示为准，不照抄其他项目地址。
4. 对网站对应记录关闭 DDNS 自动更新，清理该主机名上相互冲突的记录。邮箱等其他 DNS 记录保持原用途。
5. 如 Vercel 要求 TXT 所有权验证，按它给出的完整记录名和值添加。免费共享子域名若无权添加所需验证记录，不能保证绑定成功；需换自己可管理的域名或使用 Vercel 默认域名。
6. 验证 DNS、Vercel 域名状态和 HTTPS 证书；更新 `SITE_URL`，移除临时 `SITE_NOINDEX=true` 后重新构建，检查 canonical、RSS 与 sitemap。

Vercel 项目名暂定 `rukiaovo-homepage`，默认域名候选 `rukiaovo-homepage.vercel.app`，名称可用性需在 Vercel 账号内核实。它是本轮可以先准备的稳定托管域名；之后若 ClouDNS 已有可管理的完整域名，再按 Vercel 面板给出的 DNS/TXT 记录绑定。DDNS 不参与 Vercel 网站解析，也不应持续改写指向 Vercel 的站点记录。

尚需的具体信息/账号操作：在 Vercel 确认项目名及默认域名是否可用；登录 Vercel/GitHub 完成仓库授权；如后续使用自有域名，提供 ClouDNS 中已申请且可编辑验证记录的完整域名。DNS 托管、域名所有权和 DDNS 自动更新是三个不同概念。

官方参考（本轮已读取）：

- [ClouDNS Dynamic DNS](https://www.cloudns.net/dynamic-dns/)
- [ClouDNS CNAME 记录](https://www.cloudns.net/wiki/article/13/)
- [Vercel 添加域名](https://vercel.com/docs/domains/working-with-domains/add-a-domain)
