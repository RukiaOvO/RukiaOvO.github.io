import { createHash, randomBytes } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";

export const editorRepository = { owner: "RukiaOvO", name: "RukiaOvO.github.io", branch: "codex/vercel-site" } as const;
const api = `https://api.github.com/repos/${editorRepository.owner}/${editorRepository.name}`;
const editorBranchPrefix = "cms-editor/";
const legacyEditorBranchPrefix = "cms/posts/";

export class GitHubError extends Error {
  constructor(readonly status: number, readonly code: string) { super(code); }
}

type GitHubPull = {
  number: number; title: string; html_url: string; created_at: string; state: string;
  head: { ref: string; sha: string }; base: { ref: string };
};
type GitHubContent = { sha: string; content: string; encoding: string };
type GitHubChangedFile = { filename: string; status: string };

function apiUrl(endpoint: string) { return `${api}${endpoint}`; }
function encodedPath(value: string) { return value.split("/").map(encodeURIComponent).join("/"); }

export async function github<T>(token: string, endpoint: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("Accept", "application/vnd.github+json");
  headers.set("X-GitHub-Api-Version", "2022-11-28");
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const response = await fetch(apiUrl(endpoint), {
    ...init,
    headers,
    cache: "no-store", signal: AbortSignal.timeout(12_000), redirect: "error",
  });
  if (!response.ok) throw new GitHubError(response.status, response.status === 404 ? "NOT_FOUND" : response.status === 409 || response.status === 422 ? "CONFLICT" : response.status === 403 ? "FORBIDDEN" : "UPSTREAM");
  if (response.status === 204) return undefined as T;
  return await response.json() as T;
}

export function validArticleFile(file: string) {
  return /^[\p{L}\p{N}][\p{L}\p{N}-]{0,180}\.md$/u.test(file) && !file.includes("..") && file !== "_index.md";
}
export function postPath(file: string) { return `content/posts/${file}`; }
export function branchForNewArticle(file: string) { return `${editorBranchPrefix}${createHash("sha256").update(file).digest("hex").slice(0, 12)}-${randomBytes(4).toString("hex")}`; }
export function validEditorBranch(branch: string) {
  return /^cms-editor\/[a-f0-9]{12}-[a-f0-9]{8}$/.test(branch)
    || (branch.startsWith(legacyEditorBranchPrefix) && /^cms\/posts\/[\p{L}\p{N}][\p{L}\p{N}-]{0,180}$/u.test(branch));
}

export async function getEditorArticles() {
  const directory = path.join(process.cwd(), "content/posts");
  const files = (await readdir(directory)).filter((file) => validArticleFile(file));
  const articles = await Promise.all(files.map(async (file) => {
    try {
      const source = await readFile(path.join(directory, file), "utf8");
      const parsed = matter(source);
      const date = parsed.data.date instanceof Date ? parsed.data.date.toISOString() : String(parsed.data.date || "");
      return {
        file, title: typeof parsed.data.title === "string" ? parsed.data.title : file.replace(/\.md$/, ""), date,
        draft: parsed.data.draft === true,
      };
    } catch { return null; }
  }));
  return articles.filter((article): article is NonNullable<typeof article> => article !== null)
    .sort((a, b) => b.date.localeCompare(a.date) || a.file.localeCompare(b.file));
}

export async function getEditorPullRequests(token: string): Promise<GitHubPull[]> {
  const pulls = await github<GitHubPull[]>(token, `/pulls?state=open&base=${encodeURIComponent(editorRepository.branch)}&per_page=100`);
  return pulls.filter((pull) => validEditorBranch(pull.head.ref) && pull.base.ref === editorRepository.branch);
}

export async function getEditorDrafts(token: string) {
  const pulls = (await getEditorPullRequests(token)).slice(0, 30);
  return (await Promise.all(pulls.map(async (pull) => {
    const files = await github<GitHubChangedFile[]>(token, `/pulls/${pull.number}/files?per_page=100`);
    return { pull, files: files.filter((file) => file.status !== "removed" && file.filename.startsWith("content/posts/") && validArticleFile(file.filename.slice("content/posts/".length))) };
  }))).filter(({ files }) => files.length > 0);
}

export async function getPullForBranch(token: string, branch: string) {
  const pulls = await getEditorPullRequests(token);
  return pulls.find((pull) => pull.head.ref === branch) ?? null;
}

export async function getEditablePull(token: string, branch: string, file: string) {
  const pull = await getPullForBranch(token, branch);
  if (!pull) return null;
  const files = await github<GitHubChangedFile[]>(token, `/pulls/${pull.number}/files?per_page=100`);
  return files.some((changed) => changed.filename === postPath(file) && changed.status !== "removed") ? pull : null;
}

export async function getBranchContent(token: string, branch: string, file: string) {
  const content = await github<GitHubContent>(token, `/contents/${encodedPath(postPath(file))}?ref=${encodeURIComponent(branch)}`);
  if (content.encoding !== "base64") throw new GitHubError(502, "CONTENT_FORMAT");
  return { sha: content.sha, source: Buffer.from(content.content.replace(/\s/g, ""), "base64").toString("utf8") };
}

export async function ensureBranch(token: string, branch: string) {
  try { await github(token, `/git/ref/heads/${encodedPath(branch)}`); return; }
  catch (error) { if (!(error instanceof GitHubError) || error.status !== 404) throw error; }
  const base = await github<{ object: { sha: string } }>(token, `/git/ref/heads/${encodedPath(editorRepository.branch)}`);
  try {
    await github(token, "/git/refs", { method: "POST", body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: base.object.sha }) });
  } catch (error) {
    if (!(error instanceof GitHubError) || error.code !== "CONFLICT") throw error;
    await github(token, `/git/ref/heads/${encodedPath(branch)}`);
  }
}

async function putRepositoryContent(token: string, branch: string, filePath: string, encodedContent: string, message: string) {
  let sha: string | undefined;
  try { sha = (await github<{ sha: string }>(token, `/contents/${encodedPath(filePath)}?ref=${encodeURIComponent(branch)}`)).sha; }
  catch (error) { if (!(error instanceof GitHubError) || error.status !== 404) throw error; }
  await github(token, `/contents/${encodedPath(filePath)}`, {
    method: "PUT", body: JSON.stringify({ message, content: encodedContent, branch, ...(sha ? { sha } : {}) }),
  });
}

export async function writeRepositoryFile(token: string, branch: string, filePath: string, content: string, message: string) {
  await putRepositoryContent(token, branch, filePath, Buffer.from(content, "utf8").toString("base64"), message);
}
export async function writeRepositoryBytes(token: string, branch: string, filePath: string, content: Uint8Array, message: string) {
  await putRepositoryContent(token, branch, filePath, Buffer.from(content).toString("base64"), message);
}

export async function savePullRequest(token: string, branch: string, title: string, file: string) {
  const pull = await getPullForBranch(token, branch);
  if (pull) {
    await github(token, `/pulls/${pull.number}`, { method: "PATCH", body: JSON.stringify({ title: `文章草稿：${title}`, body: `由站内 Markdown 编辑器保存。\n\n内容文件：\`${postPath(file)}\`\n\n合并到 \`${editorRepository.branch}\` 后由 Vercel 自动发布。` }) });
    return { number: pull.number, url: pull.html_url };
  }
  try {
    const created = await github<{ number: number; html_url: string }>(token, "/pulls", {
      method: "POST", body: JSON.stringify({ title: `文章草稿：${title}`, head: branch, base: editorRepository.branch, body: `由站内 Markdown 编辑器保存。\n\n内容文件：\`${postPath(file)}\`\n\n合并到 \`${editorRepository.branch}\` 后由 Vercel 自动发布。` }),
    });
    return { number: created.number, url: created.html_url };
  } catch (error) {
    if (!(error instanceof GitHubError) || error.code !== "CONFLICT") throw error;
    const existing = await getPullForBranch(token, branch);
    if (!existing) throw error;
    return { number: existing.number, url: existing.html_url };
  }
}

export function parseArticle(source: string, file: string) {
  const parsed = matter(source);
  const list = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  const date = parsed.data.date instanceof Date ? parsed.data.date.toISOString() : String(parsed.data.date || "");
  return {
    file,
    title: typeof parsed.data.title === "string" ? parsed.data.title : "",
    date,
    draft: parsed.data.draft === true,
    summary: typeof parsed.data.summary === "string" ? parsed.data.summary : "",
    tags: list(parsed.data.tags),
    categories: list(parsed.data.categories),
    content: parsed.content,
  };
}
