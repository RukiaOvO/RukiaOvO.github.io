import type { Metadata } from "next";
import Script from "next/script";
import { site } from "@/lib/site";
import { isCmsOAuthConfigured } from "@/lib/cms-oauth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "内容管理", robots: { index: false, follow: false } };
export default function Admin() {
  const repo = `https://github.com/${site.comments.owner}/${site.comments.repo}`;
  const branch = "codex/vercel-site";
  const branchPath = encodeURIComponent(branch);
  if (isCmsOAuthConfigured()) return <div className="cms-screen"><Script src="https://cdn.jsdelivr.net/npm/decap-cms@3.17.3/dist/decap-cms.js" strategy="afterInteractive" /><div id="nc-root" /></div>;
  return <><header className="page-intro"><p className="eyebrow">WRITE & PUBLISH</p><h1>内容工作台<span className="accent">。</span></h1><p>用 Markdown 在 GitHub 编写，再由 Vercel 构建发布。</p></header>
    <section className="panel prose"><h2>站内 CMS 配置待完成</h2><p>Decap CMS 已准备接入，但尚未配置 GitHub OAuth App 与长期 Vercel 项目环境变量。完成 OAuth 设置后，此页面会显示登录编辑器。</p>
      <h2>现在用 GitHub 网页写作</h2><p>使用有仓库写入权限的 GitHub 账号，创建文章或上传图片到新站分支 <code>{branch}</code>，再发起 Pull Request。合并到该分支后 Vercel 会自动发布。</p>
      <div className="admin-actions"><a className="button" href={`${repo}/new/${branchPath}/content/posts`} target="_blank" rel="noreferrer">在 GitHub 写文章 ↗</a><a className="button button-outline" href={`${repo}/upload/${branchPath}/content/posts`} target="_blank" rel="noreferrer">上传 Markdown ↗</a><a className="button button-outline" href={`${repo}/upload/${branchPath}/static/img/posts`} target="_blank" rel="noreferrer">上传图片 ↗</a></div>
      <p>提交时请选择独立分支，再创建 Pull Request。下方自动部署流程需先完成 Vercel 项目与仓库关联。</p>
      <h2>发布一篇文章</h2><ol><li>在仓库的 <code>content/posts</code> 下创建 Markdown 文件，填写标题、日期、摘要和正文。</li><li>将图片放入 <code>static/img/posts</code>，文章中使用 <code>/img/posts/文件名</code> 引用。</li><li>提交到独立分支并创建 Pull Request，检查构建结果和 Vercel Preview。</li><li>预览确认后合并到 Vercel 项目绑定的生产分支。首次使用需在 Vercel 完成仓库关联。</li></ol>
      <p>只有仓库协作者可以写入内容。未来日期和草稿不会发布；未来文章到期后需要重新构建。</p>
      <div className="hero-actions"><a className="button" href={`${repo}/tree/${branchPath}/content/posts`} target="_blank" rel="noreferrer">管理 Markdown 文章 ↗</a><a href={`${repo}/pulls?q=${encodeURIComponent(`is:pr is:open base:${branch}`)}`} target="_blank" rel="noreferrer">查看发布中的更改 ↗</a></div>
    </section></>;
}
