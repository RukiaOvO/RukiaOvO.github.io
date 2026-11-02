import matter from "gray-matter";
import { getEditorToken, hasSameOrigin, authRequired, noStore, originRejected, safeError } from "@/lib/editor-api";
import { branchForNewArticle, ensureBranch, getBranchContent, getPullForBranch, parseArticle, postPath, savePullRequest, validArticleFile, validEditorBranch, writeRepositoryFile } from "@/lib/editor-github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

type Input = { file?: unknown; title?: unknown; date?: unknown; draft?: unknown; summary?: unknown; tags?: unknown; categories?: unknown; content?: unknown; branch?: unknown };

export async function POST(request: Request) {
  const token = getEditorToken(request);
  if (!token) return authRequired();
  if (!hasSameOrigin(request)) return originRejected();
  const length = Number(request.headers.get("content-length") || 0);
  if (length > 600_000) return noStore({ error: "文章超过 500 KB 限制。" }, 413);
  let input: Input;
  try { input = await request.json() as Input; }
  catch { return noStore({ error: "文章内容格式无效。" }, 400); }
  const { file, title, date, draft, summary, tags, categories, content, branch: requestedBranch } = input;
  if (typeof file !== "string" || !validArticleFile(file) || typeof title !== "string" || !title.trim() || title.length > 180 || typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2})?(?:\.\d{1,3})?(?:Z|[+-]\d{2}:?\d{2})?)?$/.test(date) || !Number.isFinite(Date.parse(date)) || typeof draft !== "boolean" || typeof content !== "string" || content.length > 500_000 || typeof summary !== "string" || summary.length > 1200 || !Array.isArray(tags) || tags.length > 30 || tags.some((item) => typeof item !== "string" || item.length > 80) || !Array.isArray(categories) || categories.length > 20 || categories.some((item) => typeof item !== "string" || item.length > 80)) {
    return noStore({ error: "请检查标题、日期、摘要、标签和正文格式。" }, 400);
  }
  if (requestedBranch !== undefined && (typeof requestedBranch !== "string" || !validEditorBranch(requestedBranch))) return noStore({ error: "草稿分支无效，请刷新文章列表。" }, 400);

  try {
    const branch = typeof requestedBranch === "string" ? requestedBranch : branchForNewArticle(file);
    if (requestedBranch && !await getPullForBranch(token, branch)) return noStore({ error: "关联的草稿 PR 已关闭或不存在，请刷新列表后另存为新草稿。" }, 409);
    await ensureBranch(token, branch);
    const metadata = { title: title.trim(), date: new Date(date).toISOString(), draft, ...(summary.trim() ? { summary: summary.trim() } : {}), tags: tags.map((value) => value.trim()).filter(Boolean), categories: categories.map((value) => value.trim()).filter(Boolean) };
    const markdown = matter.stringify(content.replace(/^\uFEFF/, ""), metadata);
    // Resolve the branch's current version to avoid silently overwriting another writer's commit.
    try { await getBranchContent(token, branch, file); }
    catch (error) { if (!(error && typeof error === "object" && "status" in error && error.status === 404)) throw error; }
    await writeRepositoryFile(token, branch, postPath(file), markdown, `Update article: ${title.trim()}`);
    const result = await savePullRequest(token, branch, title.trim(), file);
    return noStore({ ok: true, file, branch, pullNumber: result.number, pullUrl: result.url, article: parseArticle(markdown, file) });
  } catch (error) { return safeError(error); }
}
