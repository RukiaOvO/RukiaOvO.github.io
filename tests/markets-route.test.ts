import assert from "node:assert/strict";
import test from "node:test";
import { GET } from "../app/api/markets/route";

test("markets endpoint combines daily index closes and the free spot gold quote", async () => {
  const originalFetch = globalThis.fetch;
  const requested: string[] = [];
  globalThis.fetch = async (input) => {
    const url = String(input);
    requested.push(url);
    if (url.includes("gold-api.com")) return Response.json({ currency: "USD", price: 3900.25, updatedAt: "2026-11-03T23:59:00Z" });
    return new Response([
      'v_sh000001="1~上证指数~000001~3310.00~3300.00~3300.00~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~~20261104150000~10.00~0.30~3310.00~3300.00";',
      'v_sh000688="1~科创50~000688~1400.00~1380.00~1380.00~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~~20261104150000~20.00~1.45~1400.00~1380.00";',
      'v_sz399006="1~创业板指~399006~2500.00~2475.00~2475.00~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~~20261104150000~25.00~1.01~2500.00~2475.00";',
      'v_usINX="200~S&P 500~.INX~6868.00~6800.00~6810.00~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~~2026-11-03 16:00:00~68.00~1.00~6868.00~6800.00~USD";',
    ].join("\n"));
  };
  try {
    const response = await GET();
    const payload = await response.json() as { ok: boolean; markets: Array<{ id: string; price: number | null; changePercent: number | null; currency: string }> };
    assert.equal(response.status, 200);
    assert.equal(payload.ok, true);
    assert.deepEqual(payload.markets.map(({ id, price }) => [id, price]), [
      ["shanghai", 3310], ["star50", 1400], ["chinext", 2500], ["sp500", 6868], ["gold", 3900.25],
    ]);
    assert.equal(payload.markets[0]?.changePercent, 0.3);
    assert.equal(payload.markets[1]?.changePercent, 1.45);
    assert.equal(payload.markets[2]?.changePercent, 1.01);
    assert.equal(payload.markets[3]?.changePercent, 1);
    assert.equal(payload.markets[4]?.changePercent, null);
    assert.equal(payload.markets[4]?.currency, "USD");
    assert.equal(requested.length, 2);
    assert.ok(requested.some((url) => url.includes("api.gold-api.com/price/XAU")));
    assert.ok(requested.some((url) => url.includes("qt.gtimg.cn/q=sh000001,sh000688,sz399006,usINX")));
  } finally { globalThis.fetch = originalFetch; }
});

test("markets endpoint keeps other quotes when one upstream is unavailable", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    if (String(input).includes("gold-api.com")) return new Response(null, { status: 503 });
    return new Response('v_sh000001="1~上证指数~000001~3310.00~3300.00~3300.00~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~~20261104150000~10.00~0.30~3310.00~3300.00";v_sh000688="1~科创50~000688~1400~1380~1380~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~~20261104150000~20~1.45";v_sz399006="1~创业板指~399006~2500~2475~2475~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~~20261104150000~25~1.01";');
  };
  try {
    const response = await GET();
    const payload = await response.json() as { markets: Array<{ id: string; price: number | null }> };
    assert.equal(response.status, 200);
    assert.equal(payload.markets.find((market) => market.id === "shanghai")?.price, 3310);
    assert.equal(payload.markets.find((market) => market.id === "gold")?.price, null);
  } finally { globalThis.fetch = originalFetch; }
});
