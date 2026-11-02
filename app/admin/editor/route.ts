import { isCmsOAuthConfigured } from "@/lib/cms-oauth";

export const dynamic = "force-dynamic";

export function GET() {
  if (!isCmsOAuthConfigured()) return Response.json({ error: "CMS OAuth is not configured." }, { status: 503 });
  // Decap owns this document, so its React runtime cannot modify Next.js hydration.
  return new Response(`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>文章与图片编辑器</title><link href="/admin/config.yml" type="text/yaml" rel="cms-config-url"></head><body><div id="nc-root"></div><script src="https://cdn.jsdelivr.net/npm/decap-cms@3.17.3/dist/decap-cms.js"></script></body></html>`, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "X-Frame-Options": "SAMEORIGIN", "Content-Security-Policy": "frame-ancestors 'self'", "Cross-Origin-Opener-Policy": "same-origin-allow-popups" },
  });
}
