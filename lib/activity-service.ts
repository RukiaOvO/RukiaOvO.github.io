import { unstable_cache } from "next/cache";
import { siteContent } from "@/data/site";
import { parseFeed, parseGitHub, type Feed } from "./activity-parsers";
import { sortAndDedupe, type ActivityData, type ActivityItem } from "./activity-model";
import { fetchText, UpstreamError } from "./upstream";

// Only these editorially selected upstreams can be fetched. Query parameters cannot add URLs.
export const feeds: Feed[] = [
  { id: "bangumi-today", label: "Bangumi 今日番组", category: "动漫", url: "https://rsshub.app/bangumi/calendar/today" },
  { id: "bilibili-dynamic", label: "B站动态", category: "B站", url: "https://rsshub.app/bilibili/user/dynamic/102770566" },
  { id: "arxiv-ai", label: "arXiv AI", category: "AI", url: "https://rss.arxiv.org/rss/cs.AI" },
  { id: "huggingface-blog", label: "Hugging Face Blog", category: "AI", url: "https://huggingface.co/blog/feed.xml" },
  { id: "cls-telegraph", label: "财联社电报", category: "股市", url: "https://rsshub.app/cls/telegraph" },
  { id: "github-blog", label: "GitHub Blog", category: "工程", url: "https://github.blog/feed/" },
];
type Snapshot = { items: ActivityItem[]; updatedAt: string };
const github = unstable_cache(async (): Promise<Snapshot> => {
  const headers: Record<string, string> = { Accept: "application/vnd.github+json" };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const raw = await fetchText(`https://api.github.com/users/${siteContent.github.username}/events/public?per_page=60`, { headers });
  let data: unknown;
  try { data = JSON.parse(raw); } catch { throw new UpstreamError("INVALID_RESPONSE"); }
  return { items: parseGitHub(data), updatedAt: new Date().toISOString() };
}, ["github-events-v1", siteContent.github.username], { revalidate: 300 });
const loaders = feeds.map((feed) => ({ feed, load: unstable_cache(async (): Promise<Snapshot> => {
  const xml = await fetchText(feed.url);
  return { items: parseFeed(xml, feed), updatedAt: new Date().toISOString() };
}, ["rss-v1", feed.id, feed.url], { revalidate: 900 }) }));

export async function getActivity(kind: "github" | "rss", requestId: string): Promise<ActivityData> {
  const sources = kind === "github" ? [{ id: "github", label: "GitHub", load: github }] : loaders.map(({ feed, load }) => ({ id: feed.id, label: feed.label, load }));
  const results = await Promise.all(sources.map(async (source) => {
    try {
      const result = await source.load();
      return { items: result.items, source: { id: source.id, label: source.label, state: "ok" as const, updatedAt: result.updatedAt } };
    } catch (error) {
      console.warn(JSON.stringify({ event: "upstream_failure", requestId, source: source.id, code: error instanceof UpstreamError ? error.code : "INVALID_RESPONSE" }));
      return { items: [], source: { id: source.id, label: source.label, state: "error" as const, updatedAt: null } };
    }
  }));
  const items = results.flatMap((result) => result.items);
  return { items: kind === "rss" ? sortAndDedupe(items) : items, sources: results.map((result) => result.source) };
}
