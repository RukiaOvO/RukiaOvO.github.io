export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AnalyticsCount = { data?: { visitors?: unknown; pageviews?: unknown } };

function dateOnly(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== value ? null : value;
}

export async function GET() {
  const token = process.env.VERCEL_ANALYTICS_TOKEN;
  // Vercel provides VERCEL_PROJECT_ID and VERCEL_ORG_ID to deployed functions.
  // Keep explicit aliases for deployments that choose custom variable names.
  const projectId = process.env.VERCEL_ANALYTICS_PROJECT_ID || process.env.VERCEL_PROJECT_ID;
  const teamId = process.env.VERCEL_ANALYTICS_TEAM_ID || process.env.VERCEL_ORG_ID;
  const since = dateOnly(process.env.VERCEL_ANALYTICS_SINCE || "");
  const until = new Date().toISOString().slice(0, 10);

  if (!token || !projectId || !since || since > until) {
    return Response.json({ ok: false, error: "Visitor analytics is not configured." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }

  const url = new URL("https://api.vercel.com/v1/query/web-analytics/visits/count");
  url.searchParams.set("projectId", projectId);
  url.searchParams.set("since", since);
  url.searchParams.set("until", until);
  if (teamId) url.searchParams.set("teamId", teamId);

  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error("Vercel Analytics request failed");
    const payload = await response.json() as AnalyticsCount;
    const count = Number(payload.data?.visitors);
    if (!Number.isSafeInteger(count) || count < 0) throw new Error("Vercel Analytics returned an invalid visitor count");
    return Response.json({ ok: true, count }, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600", "X-Content-Type-Options": "nosniff" } });
  } catch {
    return Response.json({ ok: false, error: "Visitor analytics is temporarily unavailable." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
