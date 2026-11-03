import { NextResponse } from "next/server";
import { getMarketQuotes } from "@/lib/markets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const markets = await getMarketQuotes();
  return NextResponse.json({ ok: true, markets }, {
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
}
