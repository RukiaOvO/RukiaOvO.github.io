import { test, expect } from "@playwright/test";
import { filterPosts, getPosts } from "../../lib/posts";
import { absoluteUrl } from "../../lib/site";

const slug = "2026-07-01-agentspec-customizable-runtime-enforcement-for-safe-and-reliable-llm-agents";

test.beforeEach(async ({ page }) => {
  await page.route(/https:\/\/(ghchart\.rshah\.org|giscus\.app)\//, (route) => route.abort());
  await page.route("**/api/activity/**", (route) => route.fulfill({ status: 503, json: { ok: false } }));
  await page.route("https://api.open-meteo.com/**", (route) => route.fulfill({ json: { current: { temperature_2m: 18, weather_code: 1, wind_speed_10m: 5 }, daily: { temperature_2m_max: [20], temperature_2m_min: [12] } } }));
  await page.route("**/api/visitor**", (route) => route.fulfill({ json: { ok: true, count: "1234" } }));
  await page.route("**/api/markets", (route) => route.fulfill({ json: { ok: true, markets: [
    { id: "shanghai", name: "上证指数", symbol: "000001.SS", currency: "CNY", unit: "点", price: 3380.5, change: 10.5, changePercent: 0.31, asOf: "2026-11-03" },
    { id: "sp500", name: "标普 500", symbol: "^GSPC", currency: "USD", unit: "点", price: 6800.25, change: 20.25, changePercent: 0.3, asOf: "2026-11-03" },
    { id: "gold", name: "黄金现货", symbol: "XAU/USD", currency: "USD", unit: "美元/盎司", price: 3900.12, change: null, changePercent: null, asOf: "2026-11-03" },
  ] } }));
  await page.route("**/api/steam/**", (route) => {
    const url = route.request().url();
    if (url.includes("top-games")) return route.fulfill({ json: { ok: true, games: [
      { appid: 1, name: "Most played", playtimeForever: 1200 },
      { appid: 2, name: "Second played", playtimeForever: 600 },
      { appid: 3, name: "Third played", playtimeForever: 300 },
    ] } });
    return route.fulfill({ json: url.includes("/games") ? { ok: true, games: [] } : { ok: true, personaName: "Rukia", statusText: "在线", onlineState: "online", personaState: 1 } });
  });
});

test("homepage remains readable when third parties fail; themes persist", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("露琪亚");
  await expect(page.locator(".visitor-count")).toContainText("1234");
  await expect(page.getByRole("heading", { name: /AgentSpec:/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "天气" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "最近游玩" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "收盘行情" })).toBeVisible();
  await expect(page.getByText("上证指数")).toBeVisible();
  await expect(page.getByText("黄金现货")).toBeVisible();
  await expect(page.getByRole("heading", { name: "游戏时长前三" })).toBeVisible();
  await expect(page.getByText("Most played")).toBeVisible();
  await expect(page.getByRole("button", { name: "加载评论" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "精选项目" })).toHaveCount(0);
  await expect(page.getByText("QUICK ACCESS")).toHaveCount(0);
  await expect(page.getByText("最近的开发足迹")).toHaveCount(0);
  await page.getByRole("button", { name: "深色模式" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.getByRole("button", { name: "深色模式" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".theme-control")).toHaveAttribute("data-mode", "dark");
  await page.reload();
  await expect(page.getByRole("button", { name: "深色模式" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "浅色模式" }).click();
  await expect(page.locator(".theme-control")).toHaveAttribute("data-mode", "light");
  await page.getByRole("button", { name: "自动模式" }).click();
  await expect(page.locator(".theme-control")).toHaveAttribute("data-mode", "auto");
  expect(errors).toEqual([]);
});

test("search, taxonomy redirects, article TOC, images and metadata", async ({ page, request }) => {
  await page.goto("/posts/");
  await page.getByRole("searchbox").fill("AgentSpec");
  await page.getByRole("button", { name: "筛选", exact: true }).click();
  await expect(page.locator(".post-card")).toHaveCount(filterPosts(await getPosts(), { q: "AgentSpec" }).posts.length);
  await page.getByRole("link", { name: /AgentSpec:/ }).click();
  await expect(page).toHaveURL(new RegExp(`/posts/${slug}/$`));
  // App Router can briefly retain the previous page's metadata during navigation.
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", absoluteUrl(`/posts/${slug}/`));
  await expect(page.getByRole("complementary", { name: "博客目录" })).toBeVisible();
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
  await expect(page.getByRole("heading", { name: "没有找到匹配的博客" })).toBeVisible();
});

test("content workbench, pages, resources, sitemap, RSS and 404 routes", async ({ request }) => {
  for (const path of ["/", "/posts/", "/activity/", "/admin/", "/img/avatar.jpg", "/img/posts/self-adaptation-fig5.png", "/sitemap.xml", "/robots.txt", "/posts/index.xml"]) {
    expect((await request.get(path)).status(), path).toBe(200);
  }
  const admin = await (await request.get("/admin/")).text();
  expect(admin).toContain("内容工作台");
  expect(admin).not.toContain("decap-cms.js");
  expect(admin).not.toContain('src="/admin/editor/"');
  expect((await request.get("/admin/editor/")).status()).toBe(200);
  expect((await request.get("/admin/config.yml")).status()).toBe(404);
  const editorSession = await request.get("/api/editor/session");
  expect(editorSession.status()).toBe(200);
  const sessionData = await editorSession.json();
  if (sessionData.configured) {
    const authStart = await request.get("/api/auth/?provider=github", { maxRedirects: 0 });
    expect(authStart.status()).toBe(302);
    expect(authStart.headers().location).toContain("https://github.com/login/oauth/authorize?");
  } else {
    expect(admin).toContain("正在连接内容工作台");
    expect((await request.get("/api/auth/?provider=github", { maxRedirects: 0 })).status()).toBe(503);
  }
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain(`/posts/${slug}/`);
  const feed = await request.get("/posts/index.xml");
  expect(feed.headers()["content-type"]).toContain("application/rss+xml");
  expect(await feed.text()).toContain("AgentSpec:");
  expect((await request.get("/posts/nonexistent/" )).status()).toBe(404);
  expect((await request.get("/not-a-page/" )).status()).toBe(404);
  expect((await request.get("/projects/" )).status()).toBe(404);
  expect((await request.get("/about/" )).status()).toBe(404);
  const invalid = await request.get("/api/activity/?kind=invalid");
  expect(invalid.status()).toBe(400);
  expect((await invalid.json()).error.code).toBe("INVALID_QUERY");
  expect((await request.get("/api/activity/?url=https://example.com")).status()).toBe(400);
});

test("Markdown editor inserts an uploaded image into the same article draft PR", async ({ page }) => {
  const savedBodies: Record<string, unknown>[] = [];
  await page.route("**/api/editor/session", (route) => route.fulfill({ json: { authenticated: true, configured: true, user: { login: "editor", name: "Editor" } } }));
  await page.route("**/api/editor/articles", (route) => route.fulfill({ json: { articles: [] } }));
  await page.route("**/api/editor/articles/save", async (route) => {
    const body = route.request().postDataJSON() as Record<string, unknown>;
    savedBodies.push(body);
    const article = { ...body, file: "article-20261102-010101.md", summary: "", tags: [], categories: [] };
    return route.fulfill({ json: { ok: true, file: article.file, branch: "cms-editor/abcdef123456-abcdef12", pullNumber: 42, pullUrl: "https://github.com/RukiaOvO/RukiaOvO.github.io/pull/42", article } });
  });
  await page.route("**/api/editor/images", async (route) => {
    expect(route.request().method()).toBe("POST");
    expect(route.request().postData() ?? "").toContain("name=\"branch\"");
    expect(route.request().postData() ?? "").toContain("cms-editor/abcdef123456-abcdef12");
    return route.fulfill({ json: { ok: true, branch: "cms-editor/abcdef123456-abcdef12", name: "test-image.png", path: "/img/posts/test-image.png", markdown: "![](/img/posts/test-image.png)" } });
  });
  await page.goto("/admin/");
  await page.getByLabel("标题").fill("图片上传验收");
  await page.locator("#article-markdown").fill("正文开头");
  await page.locator('input[type="file"]').setInputFiles({ name: "test.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/GqkAAAAASUVORK5CYII=", "base64") });
  await expect(page.locator("#article-markdown")).toHaveValue(/!\[\]\(\/img\/posts\/test-image\.png\)/);
  await expect(page.getByText("图片已上传并插入正文", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "保存草稿 PR" }).click();
  await expect(page.getByText("已保存到草稿 PR #42。", { exact: true })).toBeVisible();
  expect(savedBodies).toHaveLength(2);
  expect(savedBodies[1].content).toContain("/img/posts/test-image.png");
  expect(savedBodies[1].branch).toBe("cms-editor/abcdef123456-abcdef12");
  expect(savedBodies[0].draft).toBe(true);
});

test("mobile layouts fit the viewport and keyboard navigation reaches main content", async ({ page }) => {
  for (const width of [320, 375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ["/", "/posts/", `/posts/${slug}/`, "/activity/", "/admin/"]) {
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
  await page.getByRole("button", { name: "浅色模式" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByRole("button", { name: "浅色模式" }).blur();
  await page.screenshot({ path: "test-results/home-mobile.png", fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: "test-results/home-desktop.png", fullPage: true });
});

test("activity filters, pagination, empty sources and partial failures", async ({ page }) => {
  const items = Array.from({ length: 13 }, (_, i) => ({ id: String(i), title: `Fixture entry ${i}`, summary: "测试内容", url: `https://example.com/${i}`, date: "2026-11-01T12:00:00.000Z", sourceId: i < 10 ? "one" : "two", source: i < 10 ? "来源一" : "来源二", category: "工程" }));
  await page.route("**/api/activity/**", (route) => route.fulfill({ json: { ok: true, data: { items, sources: [{ id: "one", label: "来源一", state: "ok", updatedAt: "2026-11-01T12:00:00.000Z" }, { id: "two", label: "来源二", state: "ok", updatedAt: "2026-11-01T12:00:00.000Z" }, { id: "broken", label: "失效来源", state: "error", updatedAt: null }] } } }));
  await page.goto("/activity/");
  expect(await page.locator(".activity-feed").first().evaluate((feed) => getComputedStyle(feed).overflowY)).toBe("auto");
  expect(await page.locator(".activity-feed").first().evaluate((feed) => feed.clientHeight)).toBeLessThanOrEqual(620);
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
  await page.goto("/activity/");
  await page.locator(".activity-feed").first().scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: "重新加载", exact: true }).click();
  await expect(page.getByText("近期暂无公开内容。").first()).toBeVisible();
});
