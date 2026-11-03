import assert from "node:assert/strict";
import test from "node:test";
import { GET } from "../app/api/visitor/route";

test("visitor API increments once per persistent browser cookie", async () => {
  const originalFetch = globalThis.fetch;
  const previousUrl = process.env.UPSTASH_REDIS_REST_URL;
  const previousToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  process.env.UPSTASH_REDIS_REST_URL = "https://redis.example.test";
  process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
  const commands: unknown[][] = [];
  globalThis.fetch = async (input, init) => {
    assert.equal(String(input), "https://redis.example.test");
    commands.push(JSON.parse(String(init?.body)) as unknown[]);
    return Response.json({ result: commands.at(-1)?.[0] === "INCR" ? 314 : 315 });
  };
  try {
    const response = await GET(new Request("https://site.example/api/visitor"));
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true, count: "314" });
    assert.match(response.headers.get("set-cookie") || "", /site_visitor_id=.*HttpOnly/);
    const cookie = response.headers.get("set-cookie")?.split(";")[0];
    const returning = await GET(new Request("https://site.example/api/visitor", { headers: { cookie: cookie || "" } }));
    assert.deepEqual(await returning.json(), { ok: true, count: "315" });
    assert.deepEqual(commands.map((command) => command[0]), ["INCR", "GET"]);
  } finally {
    globalThis.fetch = originalFetch;
    if (previousUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL; else process.env.UPSTASH_REDIS_REST_URL = previousUrl;
    if (previousToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN; else process.env.UPSTASH_REDIS_REST_TOKEN = previousToken;
  }
});
