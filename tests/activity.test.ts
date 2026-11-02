import test from "node:test";
import assert from "node:assert/strict";
import { parseFeed, parseGitHub } from "../lib/activity-parsers";
import { safeHttpUrl, sortAndDedupe } from "../lib/activity-model";
import { fetchText, UpstreamError } from "../lib/upstream";

const feed = { id: "test", label: "Test", category: "工程", url: "https://example.com/rss" };
test("RSS normalizes dates, strips markup and rejects unsafe links", () => {
  const xml = `<rss><channel><item><title>Hello &amp; world</title><link>https://example.com/a</link><pubDate>Sun, 01 Nov 2026 12:00:00 GMT</pubDate><description><![CDATA[<b>Safe</b><img src=x onerror=alert(1)> text]]></description></item><item><title>Bad</title><link>javascript:alert(1)</link></item></channel></rss>`;
  const items = parseFeed(xml, feed);
  assert.equal(items.length, 1);
  assert.equal(items[0].title, "Hello & world");
  assert.equal(items[0].summary, "Safe text");
  assert.equal(items[0].date, "2026-11-01T12:00:00.000Z");
  assert.equal(safeHttpUrl("https://user:secret@example.com"), null);
});
test("Atom selects the alternate link; empty feeds are valid, DTD and invalid XML are not", () => {
  const atom = `<feed><entry><title>Entry</title><link rel="self" href="https://example.com/self"/><link rel="alternate" href="https://example.com/post"/><updated>not-a-date</updated></entry></feed>`;
  assert.equal(parseFeed(atom, feed)[0].url, "https://example.com/post");
  assert.equal(parseFeed(atom, feed)[0].date, null);
  assert.deepEqual(parseFeed("<rss><channel/></rss>", feed), []);
  assert.throws(() => parseFeed('<!DOCTYPE rss [<!ENTITY x "boom">]><rss/>', feed));
  assert.throws(() => parseFeed("<html>error</html>", feed));
  assert.throws(() => parseFeed("<rss><channel></rss>", feed));
  assert.equal(parseFeed('<rss><channel><item><title>HTML example</title><link>https://example.com/a</link><description><![CDATA[<!DOCTYPE html><p>An example</p>]]></description></item></channel></rss>', feed)[0].summary, "An example");
});
test("RSS duplicates ignore tracking parameters and fragments while retaining newest", () => {
  const base = parseFeed('<rss><channel><item><title>A</title><link>https://example.com/a</link></item></channel></rss>', feed)[0];
  const items = sortAndDedupe([{ ...base, date: "2026-10-01T00:00:00.000Z" }, { ...base, id: "latest", url: "https://example.com/a?utm_source=feed#content", date: "2026-11-01T00:00:00.000Z" }]);
  assert.equal(items.length, 1);
  assert.equal(items[0].id, "latest");
});
test("GitHub events validate upstream shape and keep links on github.com", () => {
  const items = parseGitHub([{ id: "one", type: "IssuesEvent", created_at: "2026-11-01T00:00:00Z", repo: { name: "user/repo" }, payload: { issue: { title: "An issue", html_url: "https://evil.example/test" } } }]);
  assert.equal(items[0].url, "https://github.com/user/repo");
  assert.equal(items[0].summary, "An issue");
  assert.deepEqual(parseGitHub([]), []);
  assert.throws(() => parseGitHub({ message: "rate limit" }));
  assert.throws(() => parseGitHub([{}]));
});
test("upstream reader rejects oversized responses and non-success statuses", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response("too large");
    await assert.rejects(fetchText("https://example.com", { maxBytes: 2 }), (error: unknown) => error instanceof UpstreamError && error.code === "TOO_LARGE");
    globalThis.fetch = async () => new Response("rate limited", { status: 429 });
    await assert.rejects(fetchText("https://example.com"), (error: unknown) => error instanceof UpstreamError && error.code === "UNAVAILABLE");
    globalThis.fetch = async (_url, init) => new Promise((_resolve, reject) => init?.signal?.addEventListener("abort", () => reject(new Error("aborted")), { once: true }));
    await assert.rejects(fetchText("https://example.com", { timeoutMs: 10 }), (error: unknown) => error instanceof UpstreamError && error.code === "TIMEOUT");
  } finally { globalThis.fetch = original; }
});
