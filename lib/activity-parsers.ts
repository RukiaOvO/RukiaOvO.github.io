import { XMLParser, XMLValidator } from "fast-xml-parser";
import { z } from "zod";
import { normalizeDate, safeHttpUrl, type ActivityItem } from "./activity-model";
import { UpstreamError } from "./upstream";

const eventSchema = z.object({
  id: z.string(), type: z.string(), created_at: z.string(),
  repo: z.object({ name: z.string() }), payload: z.record(z.string(), z.unknown()).default({}),
});
const record = (value: unknown): Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const string = (value: unknown) => typeof value === "string" ? value : typeof value === "number" ? String(value) : "";

export function parseGitHub(input: unknown): ActivityItem[] {
  if (!Array.isArray(input)) throw new UpstreamError("INVALID_RESPONSE");
  const items: ActivityItem[] = [];
  for (const raw of input) {
    const parsed = eventSchema.safeParse(raw);
    if (!parsed.success) continue;
    const event = parsed.data;
    if (!/^[\w.-]+\/[\w.-]+$/.test(event.repo.name)) continue;
    const payload = event.payload;
    const action = string(payload.action);
    const detail = record(payload.pull_request ?? payload.issue ?? payload.release);
    const labels: Record<string, string> = {
      PushEvent: "提交代码", PullRequestEvent: "Pull Request", IssuesEvent: "Issue", IssueCommentEvent: "参与讨论",
      ReleaseEvent: "发布版本", ForkEvent: "Fork 仓库", WatchEvent: "收藏仓库", CreateEvent: "创建资源", DeleteEvent: "删除资源",
      PublicEvent: "公开仓库", PullRequestReviewEvent: "审查代码", PullRequestReviewCommentEvent: "审查讨论",
    };
    const repoUrl = `https://github.com/${event.repo.name}`;
    const detailUrl = safeHttpUrl(record(payload.comment).html_url ?? detail.html_url);
    const url = detailUrl && new URL(detailUrl).hostname === "github.com" ? detailUrl : repoUrl;
    items.push({ id: event.id, title: `${labels[event.type] || "更新项目"} · ${event.repo.name}`,
      summary: string(detail.title ?? detail.name ?? payload.ref).replace(/^refs\/heads\//, "").slice(0, 240) || action,
      url, date: normalizeDate(event.created_at), sourceId: "github", source: "GitHub", category: "开发" });
  }
  if (input.length && !items.length) throw new UpstreamError("INVALID_RESPONSE");
  return items;
}

export type Feed = { id: string; label: string; category: string; url: string };
function plain(value: unknown) {
  return string(value).replace(/<[^>]*>/g, " ").replace(/&nbsp;|&#160;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/\s+/g, " ").trim();
}
export function parseFeed(xml: string, feed: Feed): ActivityItem[] {
  // HTML examples inside CDATA/comments are text, not document-level entity declarations.
  const declarations = xml.replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, "").replace(/<!--[\s\S]*?-->/g, "");
  if (/<!DOCTYPE|<!ENTITY/i.test(declarations) || XMLValidator.validate(xml) !== true) throw new UpstreamError("INVALID_RESPONSE");
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@", parseTagValue: false, processEntities: true });
  const doc = record(parser.parse(xml));
  const channel = record(record(doc.rss).channel);
  const atom = record(doc.feed);
  if (!doc.rss && !doc.feed) throw new UpstreamError("INVALID_RESPONSE");
  const rawItems = channel.item ?? atom.entry ?? [];
  const items = Array.isArray(rawItems) ? rawItems : [rawItems];
  return items.slice(0, 60).flatMap((raw) => {
    const item = record(raw);
    const links = Array.isArray(item.link) ? item.link : [item.link];
    const alternate = links.find((link) => !record(link)["@rel"] || record(link)["@rel"] === "alternate");
    const url = safeHttpUrl(typeof alternate === "string" ? alternate : record(alternate)["@href"]);
    const title = plain(item.title).slice(0, 240);
    if (!url || !title) return [];
    return [{ id: `${feed.id}:${url}`, title, url, summary: plain(item.description ?? item.summary ?? item.content).slice(0, 220),
      date: normalizeDate(item.pubDate ?? item.published ?? item.updated), sourceId: feed.id, source: feed.label, category: feed.category }];
  });
}
