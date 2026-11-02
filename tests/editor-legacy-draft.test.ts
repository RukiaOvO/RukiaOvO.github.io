import assert from "node:assert/strict";
import test from "node:test";
import { GET as articlesGet } from "../app/api/editor/articles/route";

const envKeys = ["GITHUB_OAUTH_CLIENT_ID", "GITHUB_OAUTH_CLIENT_SECRET", "CMS_OAUTH_BASE_URL", "CMS_OAUTH_REDIRECT_URI"] as const;
const origin = "https://rukiaovo-homepage.vercel.app";

test("the integrated editor can list and open an existing Decap draft PR", async () => {
  const previousEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
  const originalFetch = globalThis.fetch;
  Object.assign(process.env, {
    GITHUB_OAUTH_CLIENT_ID: "client",
    GITHUB_OAUTH_CLIENT_SECRET: "secret",
    CMS_OAUTH_BASE_URL: origin,
    CMS_OAUTH_REDIRECT_URI: `${origin}/api/auth/callback?provider=github`,
  });

  const file = "2026-11-02-agentracer-who-is-inducing-failure-in-the-llm-agentic-systems.md";
  const branch = "cms/posts/2026-11-02-agentracer-who-is-inducing-failure-in-the-llm-agentic-systems";
  const source = [
    "---",
    'title: "AgentTracer draft"',
    "date: 2026-11-02",
    "draft: true",
    "---",
    "",
    "Draft body",
  ].join("\n");
  const requests: string[] = [];
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    const pathname = decodeURIComponent(url.pathname.replace(/^\/repos\/RukiaOvO\/RukiaOvO\.github\.io/, ""));
    requests.push(`${pathname}${url.search}`);
    if (pathname === "/pulls") return Response.json([{
      number: 5,
      title: "Create 文章 “AgentTracer”",
      html_url: "https://github.com/RukiaOvO/RukiaOvO.github.io/pull/5",
      created_at: "2026-11-02T00:00:00Z",
      state: "open",
      head: { ref: branch, sha: "draft-sha" },
      base: { ref: "codex/vercel-site" },
    }]);
    if (pathname === "/pulls/5/files") return Response.json([{ filename: `content/posts/${file}`, status: "added" }]);
    if (pathname === `/contents/content/posts/${file}` && url.searchParams.get("ref") === branch) {
      return Response.json({ sha: "content-sha", content: Buffer.from(source).toString("base64"), encoding: "base64" });
    }
    throw new Error(`Unexpected GitHub request: ${pathname}${url.search}`);
  };

  try {
    const cookie = "__Secure-rukia_editor_session=editor-token";
    const list = await articlesGet(new Request(`${origin}/api/editor/articles/`, { headers: { cookie } }));
    assert.equal(list.status, 200, await list.clone().text());
    const articles = (await list.json() as { articles: Array<{ file: string; branch: string | null }> }).articles;
    const draft = articles.find((article) => article.file === file);
    assert.equal(draft?.branch, branch);

    const open = await articlesGet(new Request(`${origin}/api/editor/articles/?file=${encodeURIComponent(file)}&branch=${encodeURIComponent(branch)}`, { headers: { cookie } }));
    assert.equal(open.status, 200, `${await open.clone().text()}\n${requests.join("\n")}`);
    assert.equal((await open.json() as { article: { title: string; content: string } }).article.title, "AgentTracer draft");
    assert.ok(requests.some((request) => request.includes("ref=cms%2Fposts%2F")));
  } finally {
    globalThis.fetch = originalFetch;
    for (const key of envKeys) { if (previousEnv[key] === undefined) delete process.env[key]; else process.env[key] = previousEnv[key]!; }
  }
});

test("published articles remain available when GitHub draft listing returns 404", async () => {
  const previousEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
  const originalFetch = globalThis.fetch;
  Object.assign(process.env, {
    GITHUB_OAUTH_CLIENT_ID: "client",
    GITHUB_OAUTH_CLIENT_SECRET: "secret",
    CMS_OAUTH_BASE_URL: origin,
    CMS_OAUTH_REDIRECT_URI: `${origin}/api/auth/callback?provider=github`,
  });
  globalThis.fetch = async () => Response.json({ message: "Not Found" }, { status: 404 });

  try {
    const response = await articlesGet(new Request(`${origin}/api/editor/articles/`, { headers: { cookie: "__Secure-rukia_editor_session=editor-token" } }));
    assert.equal(response.status, 200, await response.clone().text());
    const payload = await response.json() as { articles: Array<{ file: string; branch: string | null }>; draftsWarning?: string };
    assert.ok(payload.articles.length > 0);
    assert.ok(payload.articles.every((article) => article.branch === null));
    assert.match(payload.draftsWarning || "", /404/);
  } finally {
    globalThis.fetch = originalFetch;
    for (const key of envKeys) { if (previousEnv[key] === undefined) delete process.env[key]; else process.env[key] = previousEnv[key]!; }
  }
});
