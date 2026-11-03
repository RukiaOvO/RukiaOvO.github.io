import test from "node:test";
import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import path from "node:path";
import { filterPosts, formatDate, getPosts, normalizeFilters, parsePost, postUrl, renderMarkdown } from "../lib/posts";

const source = (extra = "", body = "正文内容") => `---\ntitle: Example\ndate: 2026-07-01T00:30:00+08:00\n${extra}\n---\n${body}`;
const now = new Date("2026-11-01T00:00:00Z");

test("preserves filename URLs even when publication dates change", () => {
  const post = parsePost(source(), "2026-06-01-original.md", now)!;
  assert.equal(postUrl(post), "/posts/2026-06-01-original/");
  assert.equal(formatDate(post.date), "2026-07-01");
  assert.equal(parsePost(source("slug: custom-slug"), "original.md", now)!.slug, "custom-slug");
});

test("draft and future posts are not published; malformed metadata fails visibly", () => {
  assert.equal(parsePost(source("draft: true"), "draft.md", now), null);
  assert.equal(parsePost(source().replace("2026-07-01", "2099-07-01"), "future.md", now), null);
  assert.throws(() => parsePost(source("draft: 'false'"), "invalid.md", now));
  assert.throws(() => parsePost(source("slug: ../../admin"), "invalid.md", now));
});

test("filters combine and pagination stays bounded", () => {
  const base = parsePost(source("tags: [ICSE]\ncategories: [论文研读]"), "post.md", now)!;
  const posts = Array.from({ length: 14 }, (_, i) => ({ ...base, slug: `post-${i}`, title: `Agent ${i}` }));
  assert.equal(filterPosts(posts, { q: "AGENT", tag: "icse", category: "论文研读", year: "2026" }).total, 14);
  assert.equal(filterPosts(posts, { page: "3" }).posts.length, 2);
  assert.equal(filterPosts(posts, { page: "999" }).page, 3);
  assert.equal(filterPosts(posts, { page: "-1" }).page, 1);
  assert.equal(filterPosts(posts, { q: "missing" }).total, 0);
});

test("legacy tag casing and whitespace normalize to the visible form option", () => {
  const post = parsePost(source("tags: [ICSE]\ncategories: [论文研读]"), "post.md", now)!;
  const filters = normalizeFilters([post], { tag: " icse ", category: " 论文研读 ", q: " Example " });
  assert.equal(filters.tag, "ICSE");
  assert.equal(filters.category, "论文研读");
  assert.equal(filterPosts([post], filters).total, 1);
  const unknown = normalizeFilters([post], { tag: "unknown" });
  assert.equal(unknown.tag, "unknown");
  assert.equal(filterPosts([post], unknown).total, 0);
});

test("heading IDs avoid global names while internal links retain their target", async () => {
  const { html, headings } = await renderMarkdown('## location\n\n[跳转](#location)\n\n## 中文标题\n\n[中文](#%E4%B8%AD%E6%96%87%E6%A0%87%E9%A2%98)\n\n## location');
  assert.deepEqual(headings.map((heading) => heading.id), ["heading-location", "heading-中文标题", "heading-location-1"]);
  assert.ok(html.includes('href="#heading-location"'));
  assert.ok(html.includes('href="#heading-中文标题"'));
  assert.ok(!html.includes('id="location"'));
});

test("build cutoff prevents future posts appearing in dynamic search before their detail pages exist", async () => {
  const previous = process.env.CONTENT_PUBLISH_CUTOFF;
  try {
    process.env.CONTENT_PUBLISH_CUTOFF = "2020-01-01T00:00:00Z";
    assert.equal((await getPosts()).length, 0);
  } finally {
    if (previous === undefined) delete process.env.CONTENT_PUBLISH_CUTOFF;
    else process.env.CONTENT_PUBLISH_CUTOFF = previous;
  }
});

test("Markdown has safe HTML, unique heading anchors, GFM and highlighted code", async () => {
  const { html, headings } = await renderMarkdown('## 标题\n\n## 标题\n\n<script>alert(1)</script>\n\n[x](javascript:alert)\n\n| A | B |\n| - | - |\n| 1 | 2 |\n\n```js\nconst value = 1;\n```');
  assert.equal(headings.length, 2);
  assert.notEqual(headings[0].id, headings[1].id);
  assert.ok(html.includes('<table>'));
  assert.ok(html.includes('hljs-keyword'));
  assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes('href="javascript:'));
});

test("every existing article and local Markdown image remains available", async () => {
  const posts = await getPosts();
  const agentTracer = posts.find((post) => post.slug === "2026-11-02-agentracer-who-is-inducing-failure-in-the-llm-agentic-systems");
  assert.deepEqual(agentTracer?.tags, ["ICLR", "AgenticRL", "FailureAttribution"]);
  assert.ok(posts.some((post) => post.slug === "2026-07-01-agentspec-customizable-runtime-enforcement-for-safe-and-reliable-llm-agents"));
  let images = 0;
  for (const post of posts) {
    for (const match of post.content.matchAll(/!\[[^\]]*\]\((\/img\/[^)]+)\)/g)) {
      await access(path.join(process.cwd(), "static", match[1]));
      images++;
    }
    const rendered = await renderMarkdown(post.content);
    assert.ok(rendered.headings.length > 0);
  }
  assert.ok(images >= 4);
});
