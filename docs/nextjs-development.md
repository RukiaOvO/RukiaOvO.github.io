# Next.js 开发与验收

> 当前开发说明以 [new-site-delivery.md](new-site-delivery.md) 为准。新站使用 Node.js 24、独立 `data/site.ts`、GitHub/RSS 服务端接口和站内 Markdown 工作台。

## 启动

使用 Node.js 24（与 `package.json` 的 `24.x` 一致）：

```sh
npm ci
npm run dev
```

访问 `http://localhost:3000`。如需覆盖正式 canonical，复制 `.env.example` 为 `.env.local` 并设置 `SITE_URL`。不需要第三方私密 Token。

`dev` 和 `build` 自动从 `static/` 及 `assets/img/avatar.jpg` 同步到 `public/`。不要直接编辑生成的 `public/`。Hugo 也使用该目录，因此脚本发现 `public/index.html` 时会停止；将旧 Hugo 生成目录移出后再运行。推荐使用不同 checkout 分别运行 Hugo 和 Next.js。

## 内容发布

编辑 `content/posts/*.md` 和新站独立配置 `data/site.ts`。在 `/admin/` 使用 GitHub OAuth 登录后，可创建或编辑 Markdown 文章，上传图片并直接插入正文。每篇新文章与其图片放在同一 `cms-editor/*` 草稿分支，保存时创建或更新指向 `codex/vercel-site` 的 Pull Request；尚开放的旧 Decap 文章 PR（`cms/posts/<slug>`）也能在新编辑器中继续修改。合并后 Vercel 自动构建发布；旧 `static/admin/config.yml` 仅供 Hugo 保留，不会由新站加载。

- Markdown frontmatter：`title`、`date` 必填；`draft` 为布尔值；`summary`、`description`、`tags`、`categories` 可选。
- 默认以文件名生成 slug；可选显式 `slug` 仅接受字母、数字、下划线、连字符。不要重命名已有文章文件，避免断开 URL 与评论关联。
- 草稿和未来文章不会出现在文章列表、详情、RSS 或 sitemap 中。发布判断固定到构建时间，避免动态列表先显示尚无静态详情的文章；未来文章到期后需重新构建。定时发布自动化尚未配置。
- 只支持 Markdown（含 GFM）；当前文章不需要 MDX。原始 HTML 不执行，Markdown 输出经过清理，支持代码高亮、复制、中文目录锚点与阅读时间。
- 搜索覆盖标题、摘要、分类、标签，不是全文搜索。分页唯一方案为每页 6 篇。
- Giscus 点击后才加载，不影响静态首屏；自动主题使用北京时间 06:00–18:00 的日间规则。

## 本地验证

```sh
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

已安装 Chrome 的 Windows 环境可以省略 Chromium 下载：

```powershell
$env:PLAYWRIGHT_CHROME_PATH = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
npm run test:e2e
```

浏览器回归会启动 3100 端口的生产服务，覆盖页面、图片、搜索、分类链接、404、SEO、RSS、内容工作台、主题持久化、第三方失败降级及移动端无溢出。测试不会登录账号或发布内容。截图位于忽略的 `test-results/`。动态交互测试使用夹具；真实上游另行探测。

GitHub Actions 的 `nextjs.yml` 负责 lint、类型、内容测试、构建与浏览器测试。旧 `hugo.yaml` 仍是现有 GitHub Pages 部署流程。

## Vercel Preview / Production

仓库根目录已有 `vercel.json`，框架为 Next.js、安装命令 `npm ci`、构建命令 `npm run build`。使用 Node.js 24，Root Directory 为仓库根目录，Output Directory 保持框架默认，不要设置为 Hugo 的 `public`。

在 Vercel 导入仓库后通过分支生成 Preview。`SITE_URL` 应始终指向正式域名；Preview 自动设置 noindex、禁止 robots 抓取、返回空 sitemap。可以在本地使用 `VERCEL_ENV=preview npm run build`（PowerShell 使用 `$env:VERCEL_ENV='preview'`）验证此分支。

canonical 优先取 `SITE_URL`，否则使用 `VERCEL_PROJECT_PRODUCTION_URL` / `VERCEL_URL`；仅本地默认 localhost。旧 GitHub Pages 子域名不能改为用户自己的 Vercel DNS。Vercel 项目候选名为 `rukiaovo-homepage`，默认 hostname `rukiaovo-homepage.vercel.app` 仍需在账号内确认可用；之后可追加 ClouDNS 管理的自有域名。

已完成 Vercel 匿名临时部署和线上探测，实际地址、有效期、验证边界见 [交付记录](new-site-delivery.md)。长期账号项目与 Git 发布仍按 [闭环计划](closure-and-repair-plan.md) 推进。临时部署必须设置 `SITE_NOINDEX=true`；正式稳定部署移除该变量，复核 SEO。

站内编辑器使用 `GITHUB_OAUTH_CLIENT_ID`、`GITHUB_OAUTH_CLIENT_SECRET`、`CMS_OAUTH_BASE_URL` 和 `CMS_OAUTH_REDIRECT_URI`。正式回调必须是同源 HTTPS 地址 `https://<生产域名>/api/auth/callback?provider=github`；Client Secret 只保存在 Vercel 服务端环境。OAuth App 与 Secret 已由用户配置，无需重建。部署新编辑器后需登录实测文章 PR、图片上传和插入结果。具体部署边界见 [生产部署记录](production-deployment.md)。

构建使用 Webpack，显式将 Markdown 加入服务端文件追踪。正常发布优先通过 Vercel Git 集成在 Linux 构建；Windows CLI 65.9.0 临时部署的路径和 trace 问题及本次处理记录见交付文档。
