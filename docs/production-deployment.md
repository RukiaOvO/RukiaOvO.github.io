# Vercel 生产部署记录

更新：2026-11-02（北京时间）。本记录区分实际完成的部署与仍需真实账号验收的写作流程。

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

真实用户登录、草稿保存、图片上传与审核发布仍待本人账号验收。Git 自动生产发布已通过本任务的后续提交验证，不代表 CMS 写作流程已经验收。

首次真实授权反馈停留在 “Returning to Decap CMS…”：跨来源授权返回时，回调页的 COOP 隔离策略切断了 `window.opener`。Chrome 跨来源弹窗对照实测复现；回调页改为 `unsafe-none` 后成功交还消息并关闭弹窗。编辑器保留 `same-origin-allow-popups`，state、目标 origin、消息来源和仓库写权限校验不变。修复发布后仍需本人重新授权验证。

部署验收发现 `.vercelignore` 中未限定根目录的 `config` 规则误排除了 `app/api/cms/config`；已将规则限定为 `/config/`，仅排除旧 Hugo 配置目录。修复已线上验证：未配置 OAuth 时返回 503 JSON，配置完成后返回 200 YAML。

## 后续运维

- 内容由 Decap CMS 写回 `codex/vercel-site`，图片保存到 `static/img/posts`，通过 Git 集成发布。
- ClouDNS 自定义域名暂未绑定；后续使用 Vercel Domains 提供的实际 DNS 记录，不启用网站记录的 DDNS 更新。
- 回滚应选择经过验收的历史 Vercel 部署，并同步处理 Git 中引发故障的变更；目前尚未做回滚演练。
- Giscus 登录与评论写入、共享限流、多浏览器性能评估仍按后续计划执行。
