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

## OAuth 与最终上线待办

已配置 `SITE_URL`、`CMS_OAUTH_BASE_URL`、`CMS_OAUTH_REDIRECT_URI`；暂设 `SITE_NOINDEX=true`，待最终验收后关闭并重新部署。

GitHub OAuth App 参数：

- 名称：`RukiaOvO Homepage CMS`。
- Homepage URL：`https://rukiaovo-homepage.vercel.app`。
- Authorization callback URL：`https://rukiaovo-homepage.vercel.app/api/auth/callback?provider=github`。
- Vercel Production 还需配置 `GITHUB_OAUTH_CLIENT_ID` 和 `GITHUB_OAUTH_CLIENT_SECRET`；Secret 应设为 Sensitive。密钥不写入代码、文档或聊天。

变量配置后需重新部署，再检查 `/admin/config.yml`、OAuth 跳转与真实登录。文章编辑、草稿、图片上传、审核发布、自动部署和线上内容更新仍需实际验收，不能以页面返回 200 代替。

部署验收发现 `.vercelignore` 中未限定根目录的 `config` 规则误排除了 `app/api/cms/config`；已将规则限定为 `/config/`，仅排除旧 Hugo 配置目录。修复部署后必须确认 `/admin/config.yml` 在未配置 OAuth 时返回 503 JSON、配置完成后返回 200 YAML，而不是 404。

## 后续运维

- 内容由 Decap CMS 写回 `codex/vercel-site`，图片保存到 `static/img/posts`，通过 Git 集成发布。
- ClouDNS 自定义域名暂未绑定；后续使用 Vercel Domains 提供的实际 DNS 记录，不启用网站记录的 DDNS 更新。
- 回滚应选择经过验收的历史 Vercel 部署，并同步处理 Git 中引发故障的变更；目前尚未做回滚演练。
- Giscus 登录与评论写入、共享限流、多浏览器性能评估仍按后续计划执行。
