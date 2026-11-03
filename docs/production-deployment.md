# Vercel 生产部署记录

更新：2026-11-02（北京时间）。本记录区分实际完成的部署与仍需真实账号验收的写作流程。

最新状态：新版 Markdown 工作台已部署到生产。旧编辑器留下的开放文章草稿现可在新版列表打开；本轮尚待用户确认生产环境能正常打开和保存该草稿。下方早期 Decap 线上记录用于追溯历史。

## 已完成

- Vercel 个人账号作用域：`rukiaovo`；项目：`rukiaovo-homepage`。
- 生产地址：https://rukiaovo-homepage.vercel.app
- 项目 ID：`prj_yLw1LF2odQAdh8hk9IAK4imemWYY`。
- Git 仓库：`RukiaOvO/RukiaOvO.github.io`；生产分支：`codex/vercel-site`。
- 框架 Next.js，Node.js `24.x`，安装命令 `npm ci`，构建命令 `npm run build`，输出目录使用框架默认。
- 首次成功生产部署：`dpl_DDAw7M2WM6gqGdmVBE2eExZiFUtv`，源码提交 `8e16839817601f77ef00f5ffb3b7c0fa3a7b4db3`。Vercel 从 GitHub 拉取源码，在云端完成构建，状态 `READY`。
- GitHub Actions 的 `verify` 检查已通过。旧站 `main` / GitHub Pages 未变更。

## 线上验证

已通过真实生产域名验证：首页、文章、项目、关于、动态、写作入口、文章搜索、文章图片、头像、RSS、robots、sitemap 均返回 200；不存在的页面返回 404，无效动态参数返回 400。

Chrome 实际浏览器检查通过：搜索进入 AgentSpec 文章，canonical 指向新生产域名；浅色/深色切换；375px 手机视口各主要页面无横向溢出；没有页面 JavaScript 异常。桌面和手机截图已检查。

真实 GitHub 活动接口返回 6 条数据；RSS 返回 90 条，IT之家、GitHub Blog、Hacker News 三个来源均为 `ok`。这些计数为当次验收快照。

验收产物保存在本机忽略目录 `test-results/vercel-smoke.json` 和 `test-results/vercel-*.png`，不提交测试产物或凭据。

## OAuth 与最终上线

已配置 `SITE_URL`、`CMS_OAUTH_BASE_URL`、`CMS_OAUTH_REDIRECT_URI`；前台和 CMS 登录页线上验收通过后，已将 Production 的 `SITE_NOINDEX` 改为 `false`，随本次提交重新构建后生效。Preview 仍由平台环境标记自动禁止索引。

GitHub OAuth App 参数：

- 名称：`RukiaOvO Homepage CMS`。
- Homepage URL：`https://rukiaovo-homepage.vercel.app`。
- Authorization callback URL：`https://rukiaovo-homepage.vercel.app/api/auth/callback?provider=github`。
- 用户已创建 OAuth App，Vercel Production 的 `GITHUB_OAUTH_CLIENT_ID` 和 `GITHUB_OAUTH_CLIENT_SECRET` 均已保存为 Secret；部署工具仅核对变量名称和类型。密钥不写入代码、文档或聊天。

完整 OAuth 配置已在部署 `dpl_7cB26zf7ifjsaoyMHGV9WWekW6i3`（提交 `9396f79`）验证：`/admin/config.yml` 返回 200 YAML，分支与图片目录正确；授权接口返回 302，回调和 `public_repo` 范围正确；无效 state 被拒绝；真实 Decap 脚本正常加载并显示中文 GitHub 登录按钮，浏览器无脚本异常。编辑器独立文档 `/admin/editor/` 嵌入 `/admin/`，避免 Decap 与 Next.js 的 React 初始化冲突。

用户已确认旧版真实登录和草稿保存成功；图片上传与插入失败，正是替换编辑器的原因。新版本的生产写入验收待部署后执行。

首次真实授权反馈停留在 “Returning to Decap CMS…”：跨来源授权返回时，回调页的 COOP 隔离策略切断了 `window.opener`。Chrome 跨来源弹窗对照实测复现；回调页改为 `unsafe-none` 后成功交还消息并关闭弹窗。编辑器保留 `same-origin-allow-popups`，state、目标 origin、消息来源和仓库写权限校验不变。修复发布后仍需本人重新授权验证。

部署验收发现 `.vercelignore` 中未限定根目录的 `config` 规则误排除了 `app/api/cms/config`；已将规则限定为 `/config/`，仅排除旧 Hugo 配置目录。修复已线上验证：未配置 OAuth 时返回 503 JSON，配置完成后返回 200 YAML。

## 后续运维

- 当前生产站使用新版 Markdown 编辑器。新文章和图片写入同一个 `cms-editor/*` 草稿 PR；开放的旧 Decap 文章 PR 也可继续编辑并更新原 PR，再合并到 `codex/vercel-site` 发布。
- ClouDNS 自定义域名暂未绑定；后续使用 Vercel Domains 提供的实际 DNS 记录，不启用网站记录的 DDNS 更新。
- 回滚应选择经过验收的历史 Vercel 部署，并同步处理 Git 中引发故障的变更；目前尚未做回滚演练。
- Giscus 登录与评论写入、共享限流、多浏览器性能评估仍按后续计划执行。

## 市场收盘行情

首页市场卡片从腾讯行情接口读取上证指数、标普 500 收盘行情，并从 Gold API 读取 XAU/USD 黄金现货参考价。上游响应在 Next.js 服务端缓存一天。Vercel Cron 在每天 UTC 00:10（北京时间 08:10）调用 `/api/markets/refresh`，以便在 A 股和美股收盘后刷新缓存。上线前需在 Vercel Production 环境变量设置随机 `CRON_SECRET`；Vercel 会自动附带 Bearer 认证头。接口无需行情 API Key 或付费套餐，但免费数据源没有稳定性保证。

## 2026-11-02：替换在线编辑器

用户反馈旧 Decap 流程会把上传图片显示成重复媒体条目，插入后文章无法显示图片。新版轻量 Markdown 工作台已生产部署：OAuth 同页回调、HttpOnly 服务端会话、文章列表和 metadata 编辑、图片单次上传并插入 Markdown、每篇新文章单独的草稿分支和 PR。图片通过唯一文件名写入 `static/img/posts/`，文章和图片共享 PR，保存后 Vercel 通过仓库集成发布。

- OAuth App、Production `GITHUB_OAUTH_CLIENT_ID` / `GITHUB_OAUTH_CLIENT_SECRET`、回调地址均沿用已有配置，不需用户重建或发送密钥。
- 已移除新站 Decap 配置 API和编辑器路由，并将 `/admin/config.yml` 旧静态地址明确封锁为 404；旧 Hugo 的 `static/admin/` 源文件保留，不会影响 Next.js 编辑器。
- 本地 18 项单元测试、lint、TypeScript 和 Next.js 生产构建通过。提交 `594afe1` 已推送，两个 Vercel 检查均成功；线上文章接口未登录时返回 401。
- 新版不会自动修改、关闭或合并既有 Decap PR。开放的 `cms/posts/<slug>` 文章 PR 会显示在新版列表；打开只读取内容，保存或上传图片时会更新该 PR 原分支。其他旧分支不会被接纳。
