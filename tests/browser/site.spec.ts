import { test, expect } from "@playwright/test";
import { filterPosts, getPosts } from "../../lib/posts";
import { absoluteUrl } from "../../lib/site";

const slug = "2026-07-01-agentspec-customizable-runtime-enforcement-for-safe-and-reliable-llm-agents";

test.beforeEach(async ({ page }) => {
  await page.route(/https:\/\/(ghchart\.rshah\.org|giscus\.app)\//, (route) => route.abort());
  await page.route("**/api/activity/**", (route) => route.fulfill({ status: 503, json: { ok: false } }));
});

test("homepage remains readable when third parties fail; themes persist", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("露琪亚");
  await expect(page.getByRole("heading", { name: /AgentSpec:/ })).toBeVisible();
  await page.locator(".home-bottom").scrollIntoViewIfNeeded();
  await expect(page.getByText("暂时无法获取动态，请稍后重试。")).toBeVisible();
  await page.getByLabel("外观主题").selectOption("dark");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.getByLabel("外观主题")).toHaveValue("dark");
  await page.goto("/about/");
  await page.locator(".about-contributions").scrollIntoViewIfNeeded();
  await expect(page.getByText("贡献记录暂时无法加载。")).toBeVisible();
  await page.getByRole("button", { name: "加载评论", exact: true }).click();
  await expect(page.getByText("评论暂时无法加载，请稍后重试。")).toBeVisible();
  await expect(page.locator('script[src="https://giscus.app/client.js"]')).toHaveAttribute("data-mapping", "pathname");
  expect(errors).toEqual([]);
});

test("search, taxonomy redirects, article TOC, images and metadata", async ({ page, request }) => {
  await page.goto("/posts/");
  await page.getByRole("searchbox").fill("AgentSpec");
  await page.getByRole("button", { name: "筛选", exact: true }).click();
  await expect(page.locator(".post-card")).toHaveCount(filterPosts(await getPosts(), { q: "AgentSpec" }).posts.length);
  await page.getByRole("link", { name: /AgentSpec:/ }).click();
  await expect(page).toHaveURL(new RegExp(`/posts/${slug}/$`));
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", absoluteUrl(`/posts/${slug}/`));
  await expect(page.getByRole("complementary", { name: "文章目录" })).toBeVisible();
  const imageUrls = await page.locator(".prose img").evaluateAll((images) => images.map((img) => (img as HTMLImageElement).src));
  for (const url of imageUrls) expect((await request.get(url)).status()).toBe(200);
  await page.goto("/tags/icse/");
  await expect(page).toHaveURL(/\/posts\/\?tag=icse$/);
  const tagged = filterPosts(await getPosts(), { tag: "ICSE" }).posts.length;
  await expect(page.locator(".post-card")).toHaveCount(tagged);
  await expect(page.locator('select[name="tag"]')).toHaveValue("ICSE");
  await page.getByRole("button", { name: "筛选", exact: true }).click();
  await expect(page.locator(".post-card")).toHaveCount(tagged);
  await expect(page.locator('select[name="tag"]')).toHaveValue("ICSE");
  await page.goto("/posts/?q=no-such-post");
  await expect(page.getByRole("heading", { name: "没有找到匹配的帖子" })).toBeVisible();
});

test("content workbench, pages, resources, sitemap, RSS and 404 routes", async ({ request }) => {
  for (const path of ["/", "/posts/", "/projects/", "/about/", "/activity/", "/admin/", "/img/avatar.jpg", "/img/posts/self-adaptation-fig5.png", "/sitemap.xml", "/robots.txt", "/posts/index.xml"]) {
    expect((await request.get(path)).status(), path).toBe(200);
  }
  const admin = await (await request.get("/admin/")).text();
  expect((await request.get("/admin/")).headers()["cross-origin-opener-policy"]).toBe("same-origin-allow-popups");
  const cmsConfig = await request.get("/admin/config.yml");
  if (cmsConfig.status() === 503) {
    expect(admin).toContain("内容工作台");
    expect(admin).not.toContain("decap-cms.js");
    expect((await request.get("/api/auth/?provider=github", { maxRedirects: 0 })).status()).toBe(503);
    expect((await request.get("/api/auth/callback/?provider=github&error=access_denied", { maxRedirects: 0 })).status()).toBe(503);
    const writeLink = new URL((await admin.match(/href="([^"]+\/new\/codex%2Fvercel-site\/content\/posts)"/)?.[1]) ?? "https://invalid.example");
    expect(writeLink.pathname).toContain("codex%2Fvercel-site");
  } else {
    expect(cmsConfig.status()).toBe(200);
    const cmsYaml = await cmsConfig.text();
    expect(cmsYaml).toContain("branch: codex/vercel-site");
    expect(cmsYaml).toContain("editorial_workflow");
    expect(admin).toContain("decap-cms.js");
    const authStart = await request.get("/api/auth/?provider=github", { maxRedirects: 0 });
    expect(authStart.status()).toBe(302);
    expect(authStart.headers().location).toContain("https://github.com/login/oauth/authorize?");
  }
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain(`/posts/${slug}/`);
  const feed = await request.get("/posts/index.xml");
  expect(feed.headers()["content-type"]).toContain("application/rss+xml");
  expect(await feed.text()).toContain("AgentSpec:");
  expect((await request.get("/posts/nonexistent/" )).status()).toBe(404);
  expect((await request.get("/not-a-page/" )).status()).toBe(404);
  const invalid = await request.get("/api/activity/?kind=invalid");
  expect(invalid.status()).toBe(400);
  expect((await invalid.json()).error.code).toBe("INVALID_QUERY");
  expect((await request.get("/api/activity/?url=https://example.com")).status()).toBe(400);
});

test("mobile layouts fit the viewport and keyboard navigation reaches main content", async ({ page }) => {
  for (const width of [320, 375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ["/", "/posts/", `/posts/${slug}/`, "/activity/", "/projects/", "/about/"]) {
    await page.goto(path);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), path).toBe(true);
    }
  }
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "跳转到主要内容" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();
  await page.locator("#main-content").evaluate((main) => (main as HTMLElement).blur());
  await page.getByLabel("外观主题").selectOption("light");
  await page.getByLabel("外观主题").blur();
  await page.screenshot({ path: "test-results/home-mobile.png", fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: "test-results/home-desktop.png", fullPage: true });
});

test("activity filters, pagination, empty sources and partial failures", async ({ page }) => {
  const items = Array.from({ length: 13 }, (_, i) => ({ id: String(i), title: `Fixture entry ${i}`, summary: "测试内容", url: `https://example.com/${i}`, date: "2026-11-01T12:00:00.000Z", sourceId: i < 10 ? "one" : "two", source: i < 10 ? "来源一" : "来源二", category: "工程" }));
  await page.route("**/api/activity/**", (route) => route.fulfill({ json: { ok: true, data: { items, sources: [{ id: "one", label: "来源一", state: "ok", updatedAt: "2026-11-01T12:00:00.000Z" }, { id: "two", label: "来源二", state: "ok", updatedAt: "2026-11-01T12:00:00.000Z" }, { id: "broken", label: "失效来源", state: "error", updatedAt: null }] } } }));
  await page.goto("/activity/");
  const rss = page.locator("section").filter({ has: page.getByRole("heading", { name: "阅读雷达" }) });
  await rss.scrollIntoViewIfNeeded();
  await expect(rss.locator(".activity-list li")).toHaveCount(8);
  await rss.getByRole("button", { name: /加载更多/ }).click();
  await expect(rss.locator(".activity-list li")).toHaveCount(13);
  await rss.getByRole("button", { name: "来源二", exact: true }).click();
  await expect(rss.locator(".activity-list li")).toHaveCount(3);
  await rss.getByRole("button", { name: "失效来源", exact: true }).click();
  await expect(rss.getByText("此来源暂时不可用，可切换到其他来源。")).toBeVisible();
});

test("activity retries a failed request and handles successful empty data", async ({ page }) => {
  let requests = 0;
  await page.route("**/api/activity/**", (route) => {
    requests++;
    return requests === 1 ? route.fulfill({ status: 503, json: { ok: false } }) : route.fulfill({ json: { ok: true, data: { items: [], sources: [{ id: "github", label: "GitHub", state: "ok", updatedAt: "2026-11-01T12:00:00Z" }] } } });
  });
  await page.goto("/");
  await page.locator(".home-bottom").scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: "重新加载", exact: true }).click();
  await expect(page.getByText("近期暂无公开内容。")).toBeVisible();
});
