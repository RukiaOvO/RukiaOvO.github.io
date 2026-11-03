import assert from "node:assert/strict";
import test from "node:test";
import { GET } from "../app/api/steam/[kind]/route";

test("Steam proxy forwards to the configured endpoint without requiring browser CORS", async () => {
  const previous = process.env.STEAM_STATUS_URL;
  const originalFetch = globalThis.fetch;
  process.env.STEAM_STATUS_URL = "https://steam-worker.example/steam";
  let requested = "";
  globalThis.fetch = async (input) => {
    requested = String(input);
    return Response.json({ ok: true, personaName: "Rukia", onlineState: "online" });
  };
  try {
    const response = await GET(new Request("https://site.example/api/steam/status?t=123"), { params: Promise.resolve({ kind: "status" }) });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true, personaName: "Rukia", onlineState: "online" });
    assert.equal(new URL(requested).origin, "https://steam-worker.example");
    assert.equal(new URL(requested).searchParams.get("t"), "123");
  } finally {
    globalThis.fetch = originalFetch;
    if (previous === undefined) delete process.env.STEAM_STATUS_URL; else process.env.STEAM_STATUS_URL = previous;
  }
});

test("Steam proxy rejects unknown resources and reports upstream failures", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(null, { status: 503 });
  try {
    const unknown = await GET(new Request("https://site.example/api/steam/nope"), { params: Promise.resolve({ kind: "nope" }) });
    const failed = await GET(new Request("https://site.example/api/steam/games"), { params: Promise.resolve({ kind: "games" }) });
    assert.equal(unknown.status, 404);
    assert.equal(failed.status, 502);
  } finally { globalThis.fetch = originalFetch; }
});

test("Steam API key stays server-side when the direct Steam Web API option is enabled", async () => {
  const previousKey = process.env.STEAM_API_KEY;
  const originalFetch = globalThis.fetch;
  process.env.STEAM_API_KEY = "test-secret-key";
  const requested: URL[] = [];
  globalThis.fetch = async (input) => {
    requested.push(new URL(String(input)));
    return Response.json({ response: { players: [{ personaname: "Rukia", personastate: 0, gameextrainfo: "" }] } });
  };
  try {
    const response = await GET(new Request("https://site.example/api/steam/status"), { params: Promise.resolve({ kind: "status" }) });
    assert.equal(response.status, 200);
    assert.equal((await response.json() as { personaName: string }).personaName, "Rukia");
    assert.equal(requested[0]?.searchParams.get("key"), "test-secret-key");
  } finally {
    globalThis.fetch = originalFetch;
    if (previousKey === undefined) delete process.env.STEAM_API_KEY; else process.env.STEAM_API_KEY = previousKey;
  }
});

test("Steam top games are ranked by lifetime playtime", async () => {
  const previousKey = process.env.STEAM_API_KEY;
  const originalFetch = globalThis.fetch;
  process.env.STEAM_API_KEY = "test-secret-key";
  globalThis.fetch = async () => Response.json({ response: { games: [
    { appid: 1, name: "Second", playtime_forever: 600, img_icon_url: "second" },
    { appid: 2, name: "First", playtime_forever: 1200, img_icon_url: "first" },
    { appid: 3, name: "Third", playtime_forever: 300, img_icon_url: "third" },
    { appid: 4, name: "Fourth", playtime_forever: 100 },
  ] } });
  try {
    const response = await GET(new Request("https://site.example/api/steam/top-games"), { params: Promise.resolve({ kind: "top-games" }) });
    const payload = await response.json() as { games: Array<{ name: string; playtimeForever: number }> };
    assert.equal(response.status, 200);
    assert.deepEqual(payload.games.map((game) => [game.name, game.playtimeForever]), [["First", 1200], ["Second", 600], ["Third", 300]]);
  } finally {
    globalThis.fetch = originalFetch;
    if (previousKey === undefined) delete process.env.STEAM_API_KEY; else process.env.STEAM_API_KEY = previousKey;
  }
});
