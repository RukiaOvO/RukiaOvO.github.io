import assert from "node:assert/strict";
import test from "node:test";
import { GET as authGet } from "../app/api/auth/route";
import { GET as callbackGet } from "../app/api/auth/callback/route";
import { GET as configGet } from "../app/api/cms/config/route";

const envKeys = ["GITHUB_OAUTH_CLIENT_ID", "GITHUB_OAUTH_CLIENT_SECRET", "CMS_OAUTH_BASE_URL", "CMS_OAUTH_REDIRECT_URI"] as const;

test("CMS OAuth routes validate state and repository write permission", async () => {
  const previousEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
  const originalFetch = globalThis.fetch;
  Object.assign(process.env, {
    GITHUB_OAUTH_CLIENT_ID: "test-client-id",
    GITHUB_OAUTH_CLIENT_SECRET: "test-client-secret",
    CMS_OAUTH_BASE_URL: "https://rukiaovo-homepage.vercel.app",
    CMS_OAUTH_REDIRECT_URI: "https://rukiaovo-homepage.vercel.app/api/auth/callback?provider=github",
  });

  try {
    const cmsConfig = await configGet();
    assert.equal(cmsConfig.status, 200);
    assert.match(await cmsConfig.text(), /branch: codex\/vercel-site/);

    const auth = await authGet(new Request("https://rukiaovo-homepage.vercel.app/api/auth/?provider=github"));
    assert.equal(auth.status, 302);
    const authorize = new URL(auth.headers.get("location") ?? "");
    assert.equal(authorize.origin, "https://github.com");
    assert.equal(authorize.searchParams.get("scope"), "public_repo");
    assert.equal(authorize.searchParams.get("redirect_uri"), "https://rukiaovo-homepage.vercel.app/api/auth/callback?provider=github");
    const state = authorize.searchParams.get("state");
    assert.match(state ?? "", /^[A-Za-z0-9_-]{43}$/);
    const cookie = auth.headers.get("set-cookie")?.match(/rukia_cms_oauth_state=([^;]+)/)?.[1];
    assert.equal(cookie, state);

    const denied = await callbackGet(new Request("https://rukiaovo-homepage.vercel.app/api/auth/callback/?provider=github&error=access_denied"));
    assert.equal(denied.status, 200);
    assert.match(await denied.text(), /authorization:github:error:/);
    assert.match(denied.headers.get("set-cookie") ?? "", /Max-Age=0/);

    let upstreamCalls = 0;
    globalThis.fetch = async (input) => {
      upstreamCalls++;
      const url = String(input);
      if (url === "https://github.com/login/oauth/access_token") return new Response(JSON.stringify({ access_token: "test-access-token" }), { headers: { "content-type": "application/json" } });
      if (url === "https://api.github.com/repos/RukiaOvO/RukiaOvO.github.io") return new Response(JSON.stringify({ permissions: { push: true } }), { headers: { "content-type": "application/json" } });
      throw new Error(`Unexpected OAuth upstream: ${url}`);
    };
    const invalidState = await callbackGet(new Request(`https://rukiaovo-homepage.vercel.app/api/auth/callback/?provider=github&code=temporary&state=${state}`, { headers: { cookie: "rukia_cms_oauth_state=not-the-state" } }));
    assert.equal(invalidState.status, 200);
    assert.match(await invalidState.text(), /OAuth state validation failed/);
    assert.equal(upstreamCalls, 0);

    const success = await callbackGet(new Request(`https://rukiaovo-homepage.vercel.app/api/auth/callback/?provider=github&code=temporary&state=${state}`, { headers: { cookie: `rukia_cms_oauth_state=${cookie}` } }));
    const successHtml = await success.text();
    assert.equal(success.status, 200);
    assert.equal(success.headers.get("cross-origin-opener-policy"), "same-origin-allow-popups");
    assert.match(successHtml, /authorization:github:success:/);
    assert.match(successHtml, /test-access-token/);
    assert.equal(upstreamCalls, 2);

    globalThis.fetch = async (input) => {
      if (String(input) === "https://github.com/login/oauth/access_token") return new Response(JSON.stringify({ access_token: "read-only-token" }), { headers: { "content-type": "application/json" } });
      return new Response(JSON.stringify({ permissions: { push: false } }), { headers: { "content-type": "application/json" } });
    };
    const noWriteAccess = await callbackGet(new Request(`https://rukiaovo-homepage.vercel.app/api/auth/callback/?provider=github&code=temporary&state=${state}`, { headers: { cookie: `rukia_cms_oauth_state=${cookie}` } }));
    const noWriteHtml = await noWriteAccess.text();
    assert.match(noWriteHtml, /does not have write access/);
    assert.doesNotMatch(noWriteHtml, /read-only-token/);

    process.env.CMS_OAUTH_REDIRECT_URI = "https://attacker.example/api/auth/callback?provider=github";
    assert.equal((await configGet()).status, 503);
    assert.equal((await authGet(new Request("https://rukiaovo-homepage.vercel.app/api/auth/?provider=github"))).status, 503);
  } finally {
    globalThis.fetch = originalFetch;
    for (const key of envKeys) {
      if (previousEnv[key] === undefined) delete process.env[key];
      else process.env[key] = previousEnv[key];
    }
  }
});
