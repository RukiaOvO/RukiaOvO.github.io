import { NextResponse } from "next/server";
import YAML from "yaml";
import { site } from "@/lib/site";
import { isCmsOAuthConfigured } from "@/lib/cms-oauth";

export const dynamic = "force-dynamic"; // Served at /admin/config.yml through a beforeFiles rewrite.

export function GET() {
  const baseUrl = process.env.CMS_OAUTH_BASE_URL;
  const redirectUri = process.env.CMS_OAUTH_REDIRECT_URI;
  if (!isCmsOAuthConfigured() || !baseUrl || !redirectUri) {
    return NextResponse.json({ error: "CMS OAuth is not configured." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  let base: URL;
  let redirect: URL;
  try { base = new URL(baseUrl); redirect = new URL(redirectUri); } catch {
    return NextResponse.json({ error: "CMS OAuth origin or callback URL is invalid." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  if (base.protocol !== "https:" || base.origin !== baseUrl || base.origin !== redirect.origin || redirect.pathname !== "/api/auth/callback" || redirect.search !== "?provider=github" || redirect.username || redirect.password || redirect.hash) {
    return NextResponse.json({ error: "CMS OAuth origin or callback URL is invalid." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  const config = {
    backend: { name: "github", repo: `${site.comments.owner}/${site.comments.repo}`, branch: "codex/vercel-site", base_url: base.origin, auth_endpoint: "api/auth", auth_scope: "public_repo" },
    publish_mode: "editorial_workflow",
    media_folder: "static/img/posts",
    public_folder: "/img/posts",
    locale: "zh_Hans",
    collections: [{ name: "posts", label: "文章", label_singular: "文章", folder: "content/posts", create: true,
      slug: "{{year}}-{{month}}-{{day}}-{{slug}}", extension: "md", format: "frontmatter",
      fields: [
        { label: "标题", name: "title", widget: "string" },
        { label: "日期", name: "date", widget: "datetime", default: "{{now}}", format: "YYYY-MM-DDTHH:mm:ssZ" },
        { label: "草稿", name: "draft", widget: "boolean", default: false },
        { label: "摘要", name: "summary", widget: "text", required: false },
        { label: "标签", name: "tags", widget: "list", required: false },
        { label: "分类", name: "categories", widget: "list", required: false },
        { label: "正文", name: "body", widget: "markdown" },
      ],
    }],
  };
  return new NextResponse(YAML.stringify(config), { headers: { "Content-Type": "application/yaml; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}
