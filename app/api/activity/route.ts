import { randomUUID } from "node:crypto";
import { getActivity } from "@/lib/activity-service";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 30;
export async function GET(request: Request) {
  const requestId = randomUUID();
  const params = new URL(request.url).searchParams;
  const kind = params.get("kind") || "github";
  const baseHeaders = { "X-Request-Id": requestId, "Cache-Control": "no-store" };
  if ((kind !== "github" && kind !== "rss") || [...params.keys()].some((key) => key !== "kind") || params.getAll("kind").length > 1) {
    return Response.json({ ok: false, error: { code: "INVALID_QUERY", message: "请选择有效的数据源。" }, requestId }, { status: 400, headers: baseHeaders });
  }
  try {
    const quota = await rateLimit(request);
    if (!quota.allowed) return Response.json({ ok: false, error: { code: "RATE_LIMITED", message: "请求较频繁，请稍后再试。" }, requestId }, { status: 429, headers: { ...baseHeaders, "Retry-After": String(quota.retryAfter) } });
  } catch {
    console.warn(JSON.stringify({ event: "rate_limit_storage_failure", requestId }));
    return Response.json({ ok: false, error: { code: "SERVICE_UNAVAILABLE", message: "服务暂时不可用。" }, requestId }, { status: 503, headers: baseHeaders });
  }
  const data = await getActivity(kind, requestId);
  const allFailed = data.sources.every((source) => source.state === "error");
  return Response.json(allFailed ? { ok: false, error: { code: "UPSTREAM_UNAVAILABLE", message: "数据源暂时不可用，请稍后重试。" }, data, requestId } : { ok: true, data, requestId }, {
    status: allFailed ? 503 : 200,
    headers: { ...baseHeaders, ...(allFailed ? { "Retry-After": "60" } : { "Cache-Control": "public, max-age=30, s-maxage=60, stale-while-revalidate=120" }) },
  });
}
