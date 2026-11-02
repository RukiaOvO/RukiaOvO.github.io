import assert from "node:assert/strict";
import test from "node:test";
import { GET as authGet } from "../app/api/auth/route";
import { GET as callbackGet } from "../app/api/auth/callback/route";
import { GET as sessionGet } from "../app/api/editor/session/route";
import { POST as savePost } from "../app/api/editor/articles/save/route";
import { POST as imagePost } from "../app/api/editor/images/route";

const envKeys = ["GITHUB_OAUTH_CLIENT_ID", "GITHUB_OAUTH_CLIENT_SECRET", "CMS_OAUTH_BASE_URL", "CMS_OAUTH_REDIRECT_URI"] as const;
const baseUrl = "https://rukiaovo-homepage.vercel.app";
function setConfig() {
  Object.assign(process.env, { GITHUB_OAUTH_CLIENT_ID: "client", GITHUB_OAUTH_CLIENT_SECRET: "secret", CMS_OAUTH_BASE_URL: baseUrl, CMS_OAUTH_REDIRECT_URI: `${baseUrl}/api/auth/callback?provider=github` });
}

test("GitHub OAuth creates an HttpOnly server session without exposing the token to the page", async () => {
  const previousEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
  const originalFetch = globalThis.fetch;
  setConfig();
  try {
    let upstreamCalls = 0;
    globalThis.fetch = async (input) => {
      upstreamCalls++;
      if (String(input) === "https://github.com/login/oauth/access_token") return Response.json({ access_token: "temporary-access-token", expires_in: 3600 });
      if (String(input) === "https://api.github.com/repos/RukiaOvO/RukiaOvO.github.io") return Response.json({ permissions: { push: true } });
      throw new Error(`Unexpected OAuth upstream: ${String(input)}`);
    };
    const start = await authGet(new Request(`${baseUrl}/api/auth/?provider=github&return_to=%2Fadmin%2F`));
    assert.equal(start.status, 302);
    const authorize = new URL(start.headers.get("location") ?? "");
    assert.equal(authorize.origin, "https://github.com");
    assert.equal(authorize.searchParams.get("scope"), "public_repo");
    assert.equal(authorize.searchParams.get("redirect_uri"), `${baseUrl}/api/auth/callback?provider=github`);
    const state = authorize.searchParams.get("state");
    assert.match(state ?? "", /^[A-Za-z0-9_-]{43}$/);
    const stateCookie = start.headers.get("set-cookie")?.match(/rukia_editor_oauth_state=([^;]+)/)?.[1];
    assert.equal(stateCookie, state);

    const rejected = await callbackGet(new Request(`${baseUrl}/api/auth/callback?provider=github&code=code&state=${state}`, { headers: { cookie: "rukia_editor_oauth_state=invalid" } }));
    assert.equal(rejected.status, 303);
    assert.match(rejected.headers.get("location") ?? "", /auth_error=state/);
    assert.equal(upstreamCalls, 0);

    const callback = await callbackGet(new Request(`${baseUrl}/api/auth/callback?provider=github&code=code&state=${state}`, { headers: { cookie: `rukia_editor_oauth_state=${state}; rukia_editor_return_to=%2Fadmin%2F` } }));
    assert.equal(callback.status, 303);
    assert.equal(callback.headers.get("location"), `${baseUrl}/admin/?auth=success`);
    const cookies = callback.headers.get("set-cookie") ?? "";
    assert.match(cookies, /__Secure-rukia_editor_session=temporary-access-token/);
    assert.match(cookies, /Path=\/api\/editor/);
    assert.match(cookies, /HttpOnly/);
    assert.match(cookies, /Secure/);
    assert.match(cookies, /SameSite=lax/);
    assert.equal((await callback.text()).includes("temporary-access-token"), false);
    assert.equal(upstreamCalls, 2);

    const noSession = await sessionGet(new Request(`${baseUrl}/api/editor/session`));
    assert.deepEqual(await noSession.json(), { authenticated: false, configured: true });
  } finally {
    globalThis.fetch = originalFetch;
    for (const key of envKeys) { if (previousEnv[key] === undefined) delete process.env[key]; else process.env[key] = previousEnv[key]!; }
  }
});

test("editor mutations require same-origin requests and reject invalid metadata or image data", async () => {
  const previousEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
  const originalFetch = globalThis.fetch;
  setConfig();
  try {
    let upstreamCalls = 0;
    globalThis.fetch = async () => { upstreamCalls++; throw new Error("Unexpected GitHub call"); };
    const cookie = "__Secure-rukia_editor_session=test-token";
    const wrongOrigin = await savePost(new Request(`${baseUrl}/api/editor/articles/save`, { method: "POST", headers: { cookie, origin: "https://attacker.example", "content-type": "application/json" }, body: "{}" }));
    assert.equal(wrongOrigin.status, 403);
    const invalidArticle = await savePost(new Request(`${baseUrl}/api/editor/articles/save`, { method: "POST", headers: { cookie, origin: baseUrl, "content-type": "application/json" }, body: JSON.stringify({ file: "bad.md", title: "", date: "not-a-date", draft: true, summary: "", tags: [], categories: [], content: "" }) }));
    assert.equal(invalidArticle.status, 400);

    const form = new FormData();
    form.set("file", "article-20261102-010101.md");
    form.set("branch", "cms-editor/abcdef123456-abcdef12");
    form.set("image", new File(["not an image"], "bad.svg", { type: "image/svg+xml" }));
    const invalidImage = await imagePost(new Request(`${baseUrl}/api/editor/images`, { method: "POST", headers: { cookie, origin: baseUrl }, body: form }));
    assert.equal(invalidImage.status, 415);
    assert.equal(upstreamCalls, 0);
  } finally {
    globalThis.fetch = originalFetch;
    for (const key of envKeys) { if (previousEnv[key] === undefined) delete process.env[key]; else process.env[key] = previousEnv[key]!; }
  }
});
