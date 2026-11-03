import { randomUUID } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const cookieName = "site_visitor_id";
const cookieMaxAge = 60 * 60 * 24 * 365;
const counterKey = "rukia:site:unique-visitors";

async function readCounter(increment: boolean): Promise<string> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error("Visitor counter storage is not configured");
  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(increment ? ["INCR", counterKey] : ["GET", counterKey]),
    cache: "no-store",
    signal: AbortSignal.timeout(2000),
  });
  if (!response.ok) throw new Error("Visitor counter storage is unavailable");
  const payload = await response.json() as { result?: unknown };
  const count = Number(payload.result);
  if (!Number.isSafeInteger(count) || count < 0) throw new Error("Visitor counter response is invalid");
  return String(count);
}

export async function GET(request: Request) {
  const cookies = request.headers.get("cookie") || "";
  const visitorId = cookies.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
  const isNewVisitor = !visitorId;
  try {
    const count = await readCounter(isNewVisitor);
    const response = Response.json({ ok: true, count }, { headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
    if (isNewVisitor) response.headers.append("Set-Cookie", `${cookieName}=${randomUUID()}; Path=/; Max-Age=${cookieMaxAge}; SameSite=Lax; HttpOnly${process.env.NODE_ENV === "production" ? "; Secure" : ""}`);
    return response;
  } catch {
    return Response.json({ ok: false, error: "Visitor counter is temporarily unavailable." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
