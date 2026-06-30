import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { githubConfig, rssSources } from "./activity-sources.mjs";

const githubOutput = process.env.GITHUB_EVENTS_OUTPUT || "static/data/github-events.json";
const rssOutput = process.env.RSS_FEED_OUTPUT || "static/data/rss-feed.json";
const githubToken = process.env.GITHUB_TOKEN || "";
const rsshubBaseUrls = (process.env.RSSHUB_BASE_URLS || "")
  .split(",")
  .map((url) => url.trim().replace(/\/$/, ""))
  .filter(Boolean);
const now = new Date().toISOString();

const fetchWithTimeout = async (url, options = {}, timeoutMs = 12000) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

const writeJson = async (filePath, payload) => {
  await mkdir(path.dirname(filePath), { recursive: true });
  try {
    const currentPayload = JSON.parse(await readFile(filePath, "utf8"));
    const { updatedAt: _currentUpdatedAt, ...currentStable } = currentPayload;
    const { updatedAt: _nextUpdatedAt, ...nextStable } = payload;
    if (JSON.stringify(currentStable) === JSON.stringify(nextStable)) {
      return;
    }
  } catch (error) {
    // Missing or invalid JSON should be replaced with a fresh snapshot.
  }
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
};

const stripCdata = (value) =>
  String(value || "")
    .replace(/^<!\[CDATA\[/, "")
    .replace(/\]\]>$/, "")
    .trim();

const decodeEntities = (value) =>
  stripCdata(value)
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

const stripHtml = (value) =>
  decodeEntities(value).replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();

const readTag = (xml, tagName) => {
  const match = xml.match(new RegExp(`<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tagName}>`, "i"));
  return match ? decodeEntities(match[1]) : "";
};

const readAtomLink = (xml) => {
  const match = xml.match(/<link[^>]*href=["']([^"']+)["'][^>]*>/i);
  return match ? decodeEntities(match[1]) : "";
};

const parseFeed = (xml, source) => {
  const blocks = xml.match(/<item[\s\S]*?<\/item>|<entry[\s\S]*?<\/entry>/gi) || [];
  return blocks.slice(0, 12).map((block) => ({
    label: source.label,
    category: source.category,
    title: stripHtml(readTag(block, "title")) || "Untitled",
    link: stripHtml(readTag(block, "link")) || readAtomLink(block) || source.urls[0],
    date: stripHtml(readTag(block, "pubDate") || readTag(block, "updated") || readTag(block, "published")),
    description: stripHtml(readTag(block, "description") || readTag(block, "summary") || readTag(block, "content")).slice(0, 240),
  }));
};

const parseClsTelegraph = (text, source) => {
  const payload = JSON.parse(text);
  const data = payload.data || payload;
  const records = data.roll_data || data.telegraphList || data.items || data.list || [];
  return records.slice(0, 12).map((item) => {
    const content = stripHtml(item.content || item.title || item.brief || "");
    const timestamp = Number(item.ctime || item.time || item.created_at || 0);
    const date = timestamp > 0
      ? new Date(timestamp > 9999999999 ? timestamp : timestamp * 1000).toUTCString()
      : "";
    return {
      label: source.label,
      category: source.category,
      title: content.slice(0, 80) || "财联社电报",
      link: item.shareurl || item.url || item.link || "https://www.cls.cn/telegraph",
      date,
      description: content.slice(0, 240),
    };
  });
};

const readRepoCommit = async (repo, sha, headers) => {
  if (!repo || !sha) return null;
  try {
    const response = await fetchWithTimeout(`https://api.github.com/repos/${repo}/commits/${sha}`, { headers });
    if (!response.ok) return null;
    const data = await response.json();
    return {
      sha,
      message: data?.commit?.message || "Commit",
      url: data?.html_url || `https://github.com/${repo}/commit/${sha}`,
    };
  } catch (error) {
    return null;
  }
};

const enrichGitHubEvents = async (events, headers) => {
  const enrichedEvents = [];
  for (const event of events) {
    const payload = event.payload || {};
    if (event.type === "PushEvent" && payload.head && !Array.isArray(payload.commits)) {
      const commit = await readRepoCommit(event.repo?.name, payload.head, headers);
      enrichedEvents.push(commit ? {
        ...event,
        payload: {
          ...payload,
          commits: [commit],
          size: payload.size || 1,
          distinct_size: payload.distinct_size || 1,
        },
      } : event);
    } else {
      enrichedEvents.push(event);
    }
  }
  return enrichedEvents;
};

const updateGitHubEvents = async () => {
  const url = new URL(`https://api.github.com/users/${githubConfig.username}/events/public`);
  url.searchParams.set("per_page", String(Math.max(githubConfig.eventsLimit, 10)));

  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "RukiaOvO.github.io activity-updater",
  };
  if (githubToken) headers.Authorization = `Bearer ${githubToken}`;

  try {
    const response = await fetchWithTimeout(url, { headers });
    if (!response.ok) throw new Error(`GitHub ${response.status}`);
    const events = await response.json();
    const enrichedEvents = await enrichGitHubEvents(events.slice(0, githubConfig.eventsLimit), headers);
    await writeJson(githubOutput, {
      ok: true,
      username: githubConfig.username,
      updatedAt: now,
      events: enrichedEvents,
    });
  } catch (error) {
    await writeJson(githubOutput, {
      ok: false,
      username: githubConfig.username,
      updatedAt: now,
      error: error.message,
      events: [],
    });
  }
};

const updateRssFeed = async () => {
  const settledItems = [];
  const errors = [];

  for (const source of rssSources) {
    let sourceItems = [];
    const urls = [
      ...(source.rsshubPath ? rsshubBaseUrls.map((baseUrl) => `${baseUrl}${source.rsshubPath}`) : []),
      ...source.urls,
    ];
    for (const url of urls) {
      try {
        const response = await fetchWithTimeout(url, {
          headers: {
            Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml",
            "User-Agent": "RukiaOvO.github.io activity-updater",
          },
        });
        if (!response.ok) throw new Error(`${response.status}`);
        const text = await response.text();
        sourceItems = source.type === "clsTelegraph"
          ? parseClsTelegraph(text, source)
          : parseFeed(text, source);
        if (sourceItems.length) break;
      } catch (error) {
        errors.push(`${source.label}: ${url} ${error.message}`);
      }
    }
    settledItems.push(...sourceItems);
  }

  const items = settledItems
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
    .slice(0, 80);

  await writeJson(rssOutput, {
    ok: items.length > 0,
    updatedAt: now,
    sources: rssSources.map(({ label, category, urls }) => ({ label, category, url: urls[0] })),
    errors: errors.slice(0, 12),
    items,
  });
};

await Promise.all([
  updateGitHubEvents(),
  updateRssFeed(),
]);
