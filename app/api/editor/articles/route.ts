import { readFile } from "node:fs/promises";
import path from "node:path";
import { getEditorToken, noStore, safeError } from "@/lib/editor-api";
import { GitHubError, getEditorArticles, getEditorDrafts, getBranchContent, getEditablePull, parseArticle, validArticleFile, validEditorBranch } from "@/lib/editor-github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const token = getEditorToken(request);
  if (!token) return noStore({ error: "请先使用 GitHub 登录。" }, 401);
  const params = new URL(request.url).searchParams;
  const file = params.get("file");
  const branch = params.get("branch") || "";
  if (!file) {
    try {
      const articles = await getEditorArticles();
      let drafts: Awaited<ReturnType<typeof getEditorDrafts>> = [];
      let draftsWarning: string | undefined;
      try { drafts = await getEditorDrafts(token); }
      catch (error) {
        const detail = error instanceof GitHubError ? { status: error.status, code: error.code, endpoint: error.endpoint } : { name: error instanceof Error ? error.name : "UnknownError" };
        console.warn("[editor] draft list unavailable", detail);
        draftsWarning = error instanceof GitHubError && error.status === 403
          ? "GitHub 拒绝读取草稿 PR。文章列表仍可使用，请检查该账号的仓库访问权限。"
          : error instanceof GitHubError && error.status === 404
            ? "GitHub 返回 404，草稿 PR 列表不可用。已显示仓库中的文章；新建或保存草稿可能受影响。"
            : "暂时无法同步草稿 PR。已显示仓库中的文章，稍后可刷新重试。";
      }
      const items = articles.map((article) => {
        const pending = drafts.find(({ files }) => files.some((changed) => changed.filename === `content/posts/${article.file}`));
        return { ...article, branch: pending?.pull.head.ref || null, pullNumber: pending?.pull.number || null, pullUrl: pending?.pull.html_url || null };
      });
      for (const { pull, files } of drafts) for (const changed of files) {
        const draftFile = changed.filename.slice("content/posts/".length);
        if (items.some((item) => item.file === draftFile)) continue;
        items.push({ file: draftFile, title: pull.title.replace(/^文章草稿：/, ""), date: pull.created_at, draft: true, branch: pull.head.ref, pullNumber: pull.number, pullUrl: pull.html_url });
      }
      items.sort((a, b) => b.date.localeCompare(a.date));
      return noStore({ articles: items, draftsWarning });
    } catch (error) { return safeError(error); }
  }
  if (!validArticleFile(file) || [...params.keys()].some((key) => key !== "file" && key !== "branch")) return noStore({ error: "文章路径无效。" }, 400);
  try {
    let source: string;
    if (branch) {
      if (!validEditorBranch(branch)) return noStore({ error: "草稿分支无效。" }, 400);
      const pull = await getEditablePull(token, branch, file);
      if (!pull) return noStore({ error: "草稿 PR 已关闭或不存在。" }, 404);
      const { source: draftSource } = await getBranchContent(token, branch, file);
      source = draftSource;
    } else {
      source = await readFile(path.join(process.cwd(), "content/posts", file), "utf8");
    }
    return noStore({ article: parseArticle(source, file) });
  } catch (error) { return safeError(error); }
}
