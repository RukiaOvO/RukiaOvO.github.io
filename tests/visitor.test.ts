import assert from "node:assert/strict";
import test from "node:test";
import { GET } from "../app/api/visitor/route";

test("visitor API reads the configured counter through a same-origin endpoint", async () => {
  const originalFetch = globalThis.fetch;
  let requested = "";
  globalThis.fetch = async (input) => {
    requested = String(input);
    return Response.json({ ok: true, count: 314 });
  };
  try {
    const response = await GET(new Request("https://site.example/api/visitor?t=123"));
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true, count: "314" });
    assert.equal(new URL(requested).searchParams.get("t"), "123");
  } finally { globalThis.fetch = originalFetch; }
});
