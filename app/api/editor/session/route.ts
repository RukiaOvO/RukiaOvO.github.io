import { github } from "@/lib/editor-github";
import { getEditorToken, noStore, safeError } from "@/lib/editor-api";
import { editorSessionCookie, isCmsOAuthConfigured } from "@/lib/cms-oauth";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const token = getEditorToken(request);
  if (!token) return noStore({ authenticated: false, configured: isCmsOAuthConfigured() });
  try {
    const user = await github<{ login: string; name: string | null }>(token, "/user");
    return noStore({ authenticated: true, configured: true, user: { login: user.login, name: user.name } });
  } catch (error) {
    if (error && typeof error === "object" && "status" in error && error.status === 401) {
      const response = NextResponse.json({ authenticated: false, configured: true }, { headers: { "Cache-Control": "no-store" } });
      response.cookies.set(editorSessionCookie, "", { httpOnly: true, secure: true, sameSite: "lax", path: "/api/editor", maxAge: 0 });
      return response;
    }
    return safeError(error);
  }
}
