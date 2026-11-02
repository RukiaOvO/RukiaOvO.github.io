import assert from "node:assert/strict";
import test from "node:test";
import matter from "gray-matter";
import { GET as listArticles } from "../app/api/editor/articles/route";
import { POST as savePost } from "../app/api/editor/articles/save/route";
import { POST as imagePost } from "../app/api/editor/images/route";

const envKeys = ["GITHUB_OAUTH_CLIENT_ID", "GITHUB_OAUTH_CLIENT_SECRET", "CMS_OAUTH_BASE_URL", "CMS_OAUTH_REDIRECT_URI"] as const;
const origin = "https://rukiaovo-homepage.vercel.app";

test("article and uploaded image are committed to the same branch and one draft PR", async () => {
  const previousEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
  const originalFetch = globalThis.fetch;
  Object.assign(process.env, { GITHUB_OAUTH_CLIENT_ID: "client", GITHUB_OAUTH_CLIENT_SECRET: "secret", CMS_OAUTH_BASE_URL: origin, CMS_OAUTH_REDIRECT_URI: `${origin}/api/auth/callback?provider=github` });
  const branches = new Map<string, Map<string, { sha: string; content: string }>>();
  let pull: { number: number; title: string; html_url: string; created_at: string; state: string; head: { ref: string; sha: string }; base: { ref: string } } | null = null;
  let lastPullNumber = 0;
  let calls = 0;
  const requests: string[] = [];
  globalThis.fetch = async (input, init) => {
    calls++;
    const url = new URL(String(input));
    requests.push(`${init?.method || "GET"} ${url.pathname}${url.search}`);
    const pathname = decodeURIComponent(url.pathname.replace(/^\/repos\/RukiaOvO\/RukiaOvO\.github\.io/, ""));
    const method = init?.method || "GET";
    const json = init?.body ? JSON.parse(String(init.body)) as Record<string, unknown> : {};
    if (method === "GET" && pathname === "/git/ref/heads/codex/vercel-site") return Response.json({ object: { sha: "base-sha" } });
    if (method === "GET" && pathname.startsWith("/git/ref/heads/cms-editor/")) return branches.has(pathname.slice("/git/ref/heads/".length)) ? Response.json({ object: { sha: "branch-sha" } }) : Response.json({}, { status: 404 });
    if (method === "POST" && pathname === "/git/refs") {
      const ref = String(json.ref).replace(/^refs\/heads\//, ""); branches.set(ref, new Map()); return Response.json({ ref }, { status: 201 });
    }
    if (pathname.startsWith("/contents/")) {
      const file = pathname.slice("/contents/".length);
      const branch = url.searchParams.get("ref") || (typeof json.branch === "string" ? json.branch : "codex/vercel-site");
      if (method === "GET") {
        const existing = branches.get(branch)?.get(file);
        return existing ? Response.json({ sha: existing.sha, content: Buffer.from(existing.content).toString("base64"), encoding: "base64" }) : Response.json({}, { status: 404 });
      }
      if (method === "PUT") {
        const content = Buffer.from(String(json.content), "base64").toString("utf8");
        const files = branches.get(branch);
        if (!files) return Response.json({}, { status: 404 });
        files.set(file, { sha: `sha-${files.size + 1}`, content });
        return Response.json({ content: { path: file } }, { status: 201 });
      }
    }
    if (pathname === "/pulls" && method === "GET") return Response.json(pull ? [pull] : []);
    if (pathname === "/pulls" && method === "POST") {
      pull = { number: 42, title: String(json.title), html_url: "https://github.com/RukiaOvO/RukiaOvO.github.io/pull/42", created_at: "2026-11-02T00:00:00Z", state: "open", head: { ref: String(json.head), sha: "head-sha" }, base: { ref: String(json.base) } };
      lastPullNumber = pull.number;
      return Response.json(pull, { status: 201 });
    }
    if (pathname === "/pulls/42/files" && method === "GET") return Response.json([{ filename: "content/posts/article-20261102-010101.md", status: "modified" }]);
    if (pathname === "/pulls/42" && method === "PATCH") {
      pull = { ...pull!, title: String(json.title) };
      return Response.json(pull);
    }
    throw new Error(`Unexpected mocked GitHub API request: ${method} ${url.pathname}${url.search}`);
  };

  try {
    const cookie = "__Secure-rukia_editor_session=editor-token";
    const articleFile = "article-20261102-010101.md";
    const payload = { file: articleFile, title: "Image test article", date: "2026-11-02", draft: true, summary: "summary", tags: ["test"], categories: ["notes"], content: "Initial body" };
    const firstSave = await savePost(new Request(`${origin}/api/editor/articles/save`, { method: "POST", headers: { cookie, origin, "content-type": "application/json" }, body: JSON.stringify(payload) }));
    assert.equal(firstSave.status, 200, `${await firstSave.clone().text()}\n${requests.join("\n")}`);
    const first = await firstSave.json() as { branch: string; pullNumber: number; pullUrl: string };
    assert.equal(first.pullNumber, 42);
    assert.equal(first.pullUrl, "https://github.com/RukiaOvO/RukiaOvO.github.io/pull/42");

    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/GqkAAAAASUVORK5CYII=", "base64");
    const form = new FormData(); form.set("file", articleFile); form.set("branch", first.branch); form.set("image", new File([png], "image.png", { type: "image/png" }));
    const upload = await imagePost(new Request(`${origin}/api/editor/images`, { method: "POST", headers: { cookie, origin }, body: form }));
    assert.equal(upload.status, 200, await upload.clone().text());
    const uploaded = await upload.json() as { branch: string; markdown: string; name: string };
    assert.equal(uploaded.branch, first.branch);
    assert.match(uploaded.markdown, new RegExp(`/img/posts/${uploaded.name.replaceAll(".", "\\.")}`));

    const secondSave = await savePost(new Request(`${origin}/api/editor/articles/save`, { method: "POST", headers: { cookie, origin, "content-type": "application/json" }, body: JSON.stringify({ ...payload, branch: first.branch, content: `Initial body\n\n${uploaded.markdown}` }) }));
    assert.equal(secondSave.status, 200, await secondSave.clone().text());
    const secondResult = await secondSave.json() as { branch: string; pullNumber: number; article: { file: string; title: string; content: string } };
    assert.equal(secondResult.pullNumber, 42);
    assert.equal(branches.size, 1);
    const files = branches.get(first.branch)!;
    assert.deepEqual([...files.keys()].sort(), [`content/posts/${articleFile}`, `static/img/posts/${uploaded.name}`].sort());
    const savedArticle = matter(files.get(`content/posts/${articleFile}`)!.content);
    assert.equal(savedArticle.data.draft, true);
    assert.match(savedArticle.content, new RegExp(`/img/posts/${uploaded.name.replaceAll(".", "\\.")}`));
    assert.equal(lastPullNumber, 42);
    assert.ok(calls >= 10);

    const listResponse = await listArticles(new Request(`${origin}/api/editor/articles/`, { headers: { cookie } }));
    assert.equal(listResponse.status, 200, await listResponse.clone().text());
    const listing = await listResponse.json() as { articles: Array<{ file: string; branch: string | null; pullNumber: number | null }> };
    const listedDraft = listing.articles.find((article) => article.file === secondResult.article.file);
    assert.equal(listedDraft?.branch, secondResult.branch);
    assert.equal(listedDraft?.pullNumber, 42);

    const openResponse = await listArticles(new Request(`${origin}/api/editor/articles/?file=${encodeURIComponent(secondResult.article.file)}&branch=${encodeURIComponent(secondResult.branch)}`, { headers: { cookie } }));
    assert.equal(openResponse.status, 200, await openResponse.clone().text());
    const opened = await openResponse.json() as { article: { title: string; content: string } };
    assert.equal(opened.article.title, payload.title);
    assert.match(opened.article.content, /Initial body/);
  } finally {
    globalThis.fetch = originalFetch;
    for (const key of envKeys) { if (previousEnv[key] === undefined) delete process.env[key]; else process.env[key] = previousEnv[key]!; }
  }
});
