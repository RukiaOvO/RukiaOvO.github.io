import { NextResponse } from "next/server";
import { editorSessionCookie } from "@/lib/cms-oauth";
import { getEditorToken, hasSameOrigin, authRequired, originRejected } from "@/lib/editor-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!getEditorToken(request)) return authRequired();
  if (!hasSameOrigin(request)) return originRejected();
  const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  response.cookies.set(editorSessionCookie, "", { httpOnly: true, secure: true, sameSite: "lax", path: "/api/editor", maxAge: 0 });
  return response;
}
