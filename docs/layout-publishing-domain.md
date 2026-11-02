# 布局、在线写作与 ClouDNS 接入

更新：2026-11-02。本文件补充最新用户要求；布局要求优先于此前杂志式首页方案。

## 布局

新站沿用旧站的视觉与信息结构：蓝灰配色、日夜主题、半透明卡片、顶部浮动导航、左侧个人信息、右侧主功能区。实现仍是独立 Next.js 工程。

- 侧栏：头像、个人简介、社交入口、学校/城市/研究方向、技能和常用入口。
- 主栏：贡献热力图、近期文章、精选项目、公开开发动态、留言。RSS 完整阅读在动态页。
- 手机：个人信息和主内容单列排列，热力图局部横向滚动，文章正文不横向溢出。
- 天气/Steam 等如后续接入：天气和在线状态进入侧栏，最近游玩进入主栏卡片；只在有真实数据实现后显示。

## 在线写作与上传

新站 `/admin/` 已改为站内 Markdown 工作台，不再加载 Decap CMS。登录后可以编辑文章 metadata 和 Markdown 正文、上传图片并自动插入正文。文章和图片写入同一文章专属草稿分支，保存后创建/更新 GitHub Pull Request；合并到新站分支后由 Vercel 自动部署。

当前代码配置：文章保存到 `content/posts`，图片保存到 `static/img/posts`，正文统一引用 `/img/posts/<唯一文件名>`；图片路径和文章内容由同一草稿分支提交，避免 Decap 媒体库中重复的草稿/普通条目。OAuth 回调为同源 `/api/auth/callback?provider=github`，服务端校验 state 和目标仓库写权限；访问 Token 仅保存在 HttpOnly Cookie 中，不暴露给前端脚本。

OAuth App 和 Vercel Production Secret 已由用户配置，既有回调无需调整。用户已确认上一版可以登录和保存文章，图片工作流存在重复条目和引用失效；新版代码已本地实现，真实生产账号验收待部署后完成。授权使用 GitHub OAuth 的 `public_repo` 权限，站点额外检查仓库 push 权限。文章和图片持久保存在 GitHub，不使用 Vercel 函数临时文件系统。

准确配置步骤与变量名见 [新旧主页对比与部署流程](new-old-comparison-and-rollout.md)。新版编辑器需在 Vercel 部署后由用户账号确认 PR 内文章和图片位于同一分支、正文引用可访问、图片不再重复出现。

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
