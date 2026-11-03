import { site } from "@/lib/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function readCount(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  const value = record.count ?? record.visitors ?? record.value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "string" && value.trim()) return value.trim();
  return null;
}

export async function GET(request: Request) {
  try {
    const url = new URL(site.visitor.countUrl);
    url.searchParams.set("t", new URL(request.url).searchParams.get("t") || String(Date.now()));
    const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(6000), redirect: "error" });
    if (!response.ok) throw new Error("Visitor service failed");
    const count = readCount(await response.json());
    if (!count) throw new Error("Visitor response was invalid");
    return Response.json({ ok: true, count }, { headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
  } catch {
    return Response.json({ ok: false, error: "Visitor service is temporarily unavailable." }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
