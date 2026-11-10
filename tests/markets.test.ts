import assert from "node:assert/strict";
import test from "node:test";
import { parseTencentGoldQuote, parseTencentIndexQuote } from "../lib/markets";

test("Tencent spot gold quote includes price, percent move and date", () => {
  const quote = parseTencentGoldQuote('v_hf_XAU="3900.25,1.25,3900.25,3900.50,3920.00,3880.00,19:54:00,3890.00,3890.00,0,0,0,2026-11-10,伦敦金（现货黄金）";');
  assert.equal(quote.price, 3900.25);
  assert.equal(quote.changePercent, 1.25);
  assert.ok(quote.change !== null && quote.change > 0);
  assert.equal(quote.asOf, "2026-11-10");
});

test("Tencent gold quote parser reports missing fields as unavailable", () => {
  const quote = parseTencentGoldQuote('v_hf_XAU="--,--";');
  assert.equal(quote.price, null);
  assert.equal(quote.changePercent, null);
});

test("Tencent index quote parser normalizes close, daily move and date", () => {
  const payload = 'v_usINX="200~S&P 500~.INX~6868.00~6800.00~6810.00~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~~2026-11-03 16:00:00~68.00~1.00~6868.00~6800.00~USD";';
  const quote = parseTencentIndexQuote(payload, { id: "sp500", name: "标普 500", symbol: "usINX", label: "^GSPC", currency: "USD", unit: "点" });

  assert.equal(quote.price, 6868);
  assert.equal(quote.change, 68);
  assert.equal(quote.changePercent, 1);
  assert.equal(quote.currency, "USD");
  assert.equal(quote.asOf, "2026-11-03");
});

test("Tencent quote parser leaves unavailable prices empty", () => {
  const quote = parseTencentIndexQuote('v_sh000001="1~上证指数~000001~--~--~--";', {
    id: "shanghai", name: "上证指数", symbol: "sh000001", label: "000001", currency: "CNY", unit: "点",
  });

  assert.equal(quote.price, null);
  assert.equal(quote.change, null);
  assert.equal(quote.changePercent, null);
});
