import { NextResponse } from "next/server";
import { editorSessionCookie, isCmsOAuthConfigured } from "@/lib/cms-oauth";

export function noStore(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}

export function getEditorToken(request: Request) {
  if (!isCmsOAuthConfigured()) return null;
  return request.headers.get("cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${editorSessionCookie}=`))?.slice(editorSessionCookie.length + 1) || null;
}

export function hasSameOrigin(request: Request) {
  const origin = process.env.CMS_OAUTH_BASE_URL;
  return Boolean(origin && request.headers.get("origin") === origin);
}

export function authRequired() { return noStore({ error: "请先使用 GitHub 登录。" }, 401); }
export function originRejected() { return noStore({ error: "请求来源校验失败，请刷新页面后重试。" }, 403); }

export function safeError(error: unknown) {
  if (error && typeof error === "object" && "status" in error && error.status === 404) {
    const endpoint = "endpoint" in error && typeof error.endpoint === "string" ? error.endpoint : "GitHub API";
    console.warn("[editor] GitHub resource not found", { endpoint, code: "code" in error && typeof error.code === "string" ? error.code : "NOT_FOUND" });
    return noStore({ error: `GitHub 未找到资源（${endpoint}）。草稿 PR、分支或文章文件可能已失效，请刷新列表后重试。`, code: "GITHUB_NOT_FOUND", endpoint }, 404);
  }
  if (error && typeof error === "object" && "status" in error && error.status === 403) return noStore({ error: "GitHub 拒绝了写入请求，请确认账号仍有仓库写权限。" }, 403);
  if (error && typeof error === "object" && "status" in error && error.status === 409) return noStore({ error: "草稿刚被其他操作更新，请刷新后重试。" }, 409);
  return noStore({ error: "GitHub 暂时无法处理请求，请稍后重试。" }, 502);
}
