"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";

type Article = { file: string; title: string; date: string; draft: boolean; branch: string | null; pullNumber: number | null; pullUrl: string | null };
type ArticleData = { file: string; title: string; date: string; draft: boolean; summary: string; tags: string[]; categories: string[]; content: string };
type Session = { authenticated: boolean; configured?: boolean; user?: { login: string; name: string | null } };
type UploadedImage = { name: string; url: string };
type ArticleList = { articles: Article[]; draftsWarning?: string };

function localDate(value = new Date()) {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).format(value);
}
function articleInputDate(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? localDate() : localDate(date);
}
function messageFrom(error: unknown) { return error instanceof Error ? error.message : "操作失败，请稍后重试。"; }

async function jsonRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, credentials: "same-origin", cache: "no-store" });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof result.error === "string" ? result.error : `请求失败（${response.status}）。`);
  return result as T;
}

export function MarkdownEditor() {
  const [session, setSession] = useState<Session | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [draftsWarning, setDraftsWarning] = useState("");
  const [selectedFile, setSelectedFile] = useState("");
  const [form, setForm] = useState<ArticleData | null>(null);
  const [branch, setBranch] = useState<string | null>(null);
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState("");
  const [pageError, setPageError] = useState("");
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const openArticle = useCallback(async (article: Article) => {
    setBusy(true); setPageError(""); setMessage(""); setImages([]);
    try {
      const query = new URLSearchParams({ file: article.file, ...(article.branch ? { branch: article.branch } : {}) });
      const response = await jsonRequest<{ article: ArticleData }>(`/api/editor/articles?${query}`);
      setForm(response.article); setSelectedFile(response.article.file); setBranch(article.branch); setDirty(false);
    } catch (error) {
      // A closed or deleted draft branch can remain visible briefly in the PR list.
      // Fall back to the published file so the workbench remains usable.
      if (article.branch) {
        try {
          const response = await jsonRequest<{ article: ArticleData }>(`/api/editor/articles?file=${encodeURIComponent(article.file)}`);
          setForm(response.article); setSelectedFile(response.article.file); setBranch(null); setArticles((items) => items.map((item) => item.file === article.file ? { ...item, branch: null, pullNumber: null, pullUrl: null } : item)); setDirty(false); setPageError("该草稿分支已失效，已打开已发布版本。保存后会创建新的草稿 PR。"); return;
        } catch {
          setArticles((items) => items.filter((item) => item.file !== article.file));
          setForm(null); setSelectedFile(""); setBranch(null);
          setPageError("该草稿分支已失效，请刷新文章列表或新建文章。");
          return;
        }
      }
      setPageError(messageFrom(error));
    }
    finally { setBusy(false); }
  }, []);

  const startNewArticle = useCallback(() => {
    const date = localDate();
    const suffix = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
    const file = `article-${date.replaceAll("-", "")}-${suffix.slice(-6)}.md`;
    setForm({ file, title: "", date, draft: true, summary: "", tags: [], categories: [], content: "" });
    setSelectedFile(file); setBranch(null); setImages([]); setDirty(true); setMessage(""); setPageError("");
  }, []);

  const loadArticles = useCallback(async () => {
    const response = await jsonRequest<ArticleList>("/api/editor/articles");
    setArticles(response.articles);
    setDraftsWarning(response.draftsWarning || "");
    const target = response.articles[0];
    if (target) await openArticle(target);
    else startNewArticle();
  }, [openArticle, startNewArticle]);

  useEffect(() => {
    let alive = true;
    jsonRequest<Session>("/api/editor/session").then(async (value) => {
      if (!alive) return;
      setSession(value);
      const params = new URLSearchParams(window.location.search);
      const authError = params.get("auth_error");
      if (authError) {
        const errors: Record<string, string> = { state: "登录状态校验失败，请重新登录。", cancelled: "GitHub 登录已取消。", token: "GitHub 未返回授权凭据，请检查 OAuth App 配置后重试。", credentials: "GitHub OAuth Client ID 或 Secret 无效。", redirect_uri: "GitHub OAuth 回调地址与配置不匹配。", bad_code: "授权码已失效，请重新登录。", repository_access: "当前 GitHub 账号没有仓库写入权限。", network: "连接 GitHub 超时，请稍后重试。" };
        setPageError(errors[authError] || "GitHub 登录未完成，请重试。");
      }
      if (params.has("auth") || params.has("auth_error")) window.history.replaceState(null, "", window.location.pathname);
      if (value.authenticated) {
        try { await loadArticles(); } catch (error) { if (alive) setPageError(messageFrom(error)); }
      }
    }).catch((error) => { if (alive) setPageError(messageFrom(error)); });
    return () => { alive = false; };
  }, [loadArticles]);

  function change<K extends keyof ArticleData>(key: K, value: ArticleData[K]) {
    setForm((previous) => previous ? { ...previous, [key]: value } : previous);
    setDirty(true); setMessage("");
  }

  async function saveArticle(quiet = false): Promise<string | null> {
    if (!form || !form.title.trim()) { setPageError("请先填写文章标题。"); return null; }
    setBusy(true); setPageError(""); setMessage("");
    try {
      const result = await jsonRequest<{ branch: string; pullNumber: number; pullUrl: string; article: ArticleData }>("/api/editor/articles/save", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, branch: branch || undefined }),
      });
      setForm(result.article); setBranch(result.branch); setDirty(false); if (!quiet) setMessage(`已保存到草稿 PR #${result.pullNumber}。`);
      setArticles((previous) => {
        const current: Article = { file: result.article.file, title: result.article.title, date: result.article.date, draft: result.article.draft, branch: result.branch, pullNumber: result.pullNumber, pullUrl: result.pullUrl };
        return [current, ...previous.filter((article) => article.file !== current.file)].sort((a, b) => b.date.localeCompare(a.date));
      });
      return result.branch;
    } catch (error) { setPageError(messageFrom(error)); return null; }
    finally { setBusy(false); }
  }

  async function uploadImage(file?: File) {
    if (!file || !form) return;
    const uploadBranch = branch || await saveArticle(true);
    if (!uploadBranch) return;
    setBusy(true); setPageError(""); setMessage("");
    try {
      const data = new FormData(); data.set("image", file); data.set("file", form.file); data.set("branch", uploadBranch);
      const result = await jsonRequest<{ branch: string; name: string; markdown: string; path: string }>("/api/editor/images", { method: "POST", body: data });
      const input = bodyRef.current;
      const start = input?.selectionStart ?? form.content.length;
      const end = input?.selectionEnd ?? form.content.length;
      const prefix = start > 0 && !form.content.slice(0, start).endsWith("\n") ? "\n" : "";
      const insertion = `${prefix}${result.markdown}\n`;
      const content = form.content.slice(0, start) + insertion + form.content.slice(end);
      setForm((previous) => previous ? { ...previous, content } : previous); setDirty(true); setBranch(result.branch);
      setImages((previous) => [...previous, { name: result.name, url: URL.createObjectURL(file) }]);
      setMessage(`图片已上传并插入正文：${result.name}。保存文章后会与文章一起出现在同一草稿 PR 中。`);
      requestAnimationFrame(() => { input?.focus(); input?.setSelectionRange(start + insertion.length, start + insertion.length); });
    } catch (error) { setPageError(messageFrom(error)); }
    finally { setBusy(false); if (imageInputRef.current) imageInputRef.current.value = ""; }
  }

  async function logout() {
    setBusy(true);
    try { await jsonRequest("/api/editor/logout", { method: "POST" }); setSession({ authenticated: false }); setArticles([]); setForm(null); setBranch(null); }
    catch (error) { setPageError(messageFrom(error)); }
    finally { setBusy(false); }
  }

  function beginGitHubLogin() {
    // OAuth must use a full-page navigation so GitHub can return through the registered callback.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/api/auth/?provider=github&return_to=%2Fadmin%2F");
  }

  if (!session) return <section className="panel editor-state" aria-live="polite">{pageError || "正在连接内容工作台…"}</section>;
  if (!session.authenticated) return <section className="panel editor-login"><h2>{session.configured ? "登录后开始写作" : "写作服务尚未配置"}</h2><p>使用有权写入网站仓库的 GitHub 账号。文章与图片保存在同一草稿分支，并通过 Pull Request 审核发布。</p>{pageError && <p className="editor-error" role="alert">{pageError}</p>}{session.configured ? <button className="button" type="button" onClick={beginGitHubLogin}>使用 GitHub 登录</button> : <p className="muted">请在 Vercel 配置现有 GitHub OAuth 环境变量后重新部署。</p>}</section>;

  const selected = articles.find((article) => article.file === selectedFile);
  return <section className="editor-workbench" aria-label="Markdown 内容工作台">
    <aside className="panel editor-sidebar">
      <div className="editor-sidebar-heading"><h2>文章</h2><button className="button button-outline" type="button" onClick={startNewArticle} disabled={busy}>新建</button></div>
      <label className="editor-user">已连接 @{session.user?.login}<button type="button" className="editor-logout" onClick={logout} disabled={busy}>退出</button></label>
      {draftsWarning && <p className="editor-draft-warning" role="status">{draftsWarning}</p>}
      <div className="editor-article-list" role="listbox" aria-label="选择文章">
        {articles.map((article) => <button className="editor-article-option" type="button" key={article.file} aria-pressed={selectedFile === article.file} onClick={() => openArticle(article)} disabled={busy}>
          <strong>{article.title || article.file}</strong><span>{article.pullNumber ? `草稿 PR #${article.pullNumber}` : article.draft ? "草稿" : "已发布"}</span>
        </button>)}
        {articles.length === 0 && <p className="muted">还没有文章。点击“新建”开始写第一篇。</p>}
      </div>
      <p className="editor-branch-note">保存会创建或更新文章专属草稿 PR。合并 PR 后，Vercel 会自动部署。</p>
      <a className="editor-branch-note" href="https://github.com/RukiaOvO/RukiaOvO.github.io/pulls?q=is%3Apr+is%3Aopen+base%3Acodex%2Fvercel-site" target="_blank" rel="noreferrer">查看所有草稿和发布中的 PR ↗</a>
    </aside>

    {form && <div className="panel editor-main">
      <div className="editor-main-heading"><div><p className="eyebrow">MARKDOWN EDITOR</p><h2>{selected?.pullNumber ? `编辑草稿 PR #${selected.pullNumber}` : selected ? "编辑文章" : "新建文章"}</h2></div><span className={dirty ? "editor-dirty" : "editor-clean"}>{dirty ? "有未保存更改" : "已保存"}</span></div>
      <div className="editor-meta-grid">
        <label className="editor-field editor-title-field">标题<input value={form.title} maxLength={180} onChange={(event) => change("title", event.target.value)} placeholder="为文章起个标题" /></label>
        <label className="editor-field">发布日期<input type="date" value={articleInputDate(form.date)} onChange={(event) => change("date", event.target.value)} /></label>
        <label className="editor-field">摘要<input value={form.summary} maxLength={1200} onChange={(event) => change("summary", event.target.value)} placeholder="可选，留空时自动截取正文" /></label>
        <label className="editor-field">标签<input value={form.tags.join(", ")} onChange={(event) => change("tags", event.target.value.split(",").map((item) => item.trim()).filter(Boolean))} placeholder="用英文逗号分隔" /></label>
        <label className="editor-field">分类<input value={form.categories.join(", ")} onChange={(event) => change("categories", event.target.value.split(",").map((item) => item.trim()).filter(Boolean))} placeholder="用英文逗号分隔" /></label>
        <label className="editor-draft-toggle"><input type="checkbox" checked={form.draft} onChange={(event) => change("draft", event.target.checked)} /> 仅保存为草稿</label>
      </div>
      <div className="editor-body-heading"><label htmlFor="article-markdown">正文 Markdown</label><div className="editor-image-actions"><input ref={imageInputRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp" hidden onChange={(event) => uploadImage(event.target.files?.[0])} /><button type="button" className="button button-outline" onClick={() => imageInputRef.current?.click()} disabled={busy}>上传并插入图片</button><span>PNG / JPEG / GIF / WebP · 最大 4 MB</span></div></div>
      <textarea ref={bodyRef} id="article-markdown" className="editor-markdown" value={form.content} spellCheck={false} onChange={(event) => change("content", event.target.value)} placeholder={"从这里开始写作…\n\n支持标准 Markdown，例如标题、链接、列表、表格和代码块。"} />
      {images.length > 0 && <div className="editor-image-preview" aria-label="本次上传的图片">{images.map((image) => <figure key={image.name}><Image src={image.url} alt={image.name} width={56} height={48} unoptimized /><figcaption>{image.name}</figcaption></figure>)}</div>}
      <div className="editor-save-row"><div aria-live="polite">{pageError && <span className="editor-error" role="alert">{pageError}</span>}{message && <span className="editor-success">{message}</span>}{selected?.pullUrl && !message && <a href={selected.pullUrl} target="_blank" rel="noreferrer">查看草稿 PR ↗</a>}</div><button type="button" className="button" onClick={() => void saveArticle()} disabled={busy}>{busy ? "正在保存…" : "保存草稿 PR"}</button></div>
      {form.draft && <p className="editor-hint">勾选“仅保存为草稿”时，合并后也不会公开显示文章；取消勾选并合并 PR 即可发布。</p>}
      <p className="editor-file-note">文章路径：<code>content/posts/{form.file}</code>{branch && <> · 工作分支：<code>{branch}</code></>}</p>
    </div>}
    {!form && <div className="panel editor-state">{busy ? "正在读取文章…" : "选择一篇文章，或新建文章开始写作。"}</div>}
  </section>;
}
