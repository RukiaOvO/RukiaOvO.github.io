import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { z } from "zod";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkRehype from "remark-rehype";
import rehypeSanitize from "rehype-sanitize";
import { defaultSchema } from "rehype-sanitize";
import rehypeKatex from "rehype-katex";
import rehypeSlug from "rehype-slug";
import rehypeHighlight from "rehype-highlight";
import rehypeStringify from "rehype-stringify";
import { visit } from "unist-util-visit";
import { toText } from "hast-util-to-text";
import type { Root } from "hast";

const frontmatter = z.object({
  title: z.string().trim().min(1), date: z.coerce.date(), draft: z.boolean().default(false),
  summary: z.string().default(""), description: z.string().default(""),
  tags: z.array(z.string()).default([]), categories: z.array(z.string()).default([]),
  slug: z.string().regex(/^[\p{L}\p{N}_-]+$/u).optional(),
});
export type Post = {
  slug: string; title: string; date: string; summary: string;
  tags: string[]; categories: string[]; content: string; minutes: number;
};
export type Heading = { id: string; text: string; level: number };

export function plainText(markdown: string) {
  return markdown.replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/<[^>]*>/g, "")
    .replace(/[#*`>~_]/g, "").replace(/\s+/g, " ").trim();
}

export function parsePost(source: string, filename: string, now = new Date()): Post | null {
  const { data, content } = matter(source);
  const meta = frontmatter.parse(data);
  if (meta.draft || meta.date > now) return null;
  const text = plainText(content);
  const cjk = text.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/gu)?.length || 0;
  const words = text.replace(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/gu, " ").match(/\S+/g)?.length || 0;
  return {
    slug: meta.slug || filename.replace(/\.md$/, ""), title: meta.title,
    date: meta.date.toISOString(), summary: meta.summary || meta.description || plainText(content.split(/\r?\n/).filter((line) => !/^\s*(?:#{1,6}\s|论文链接[：:]|https?:\/\/)/.test(line)).join("\n")).slice(0, 160),
    tags: meta.tags, categories: meta.categories, content,
    minutes: Math.max(1, Math.ceil(cjk / 400 + words / 200)),
  };
}

export async function getPosts(): Promise<Post[]> {
  const directory = path.join(process.cwd(), "content/posts");
  const cutoff = process.env.CONTENT_PUBLISH_CUTOFF ? new Date(process.env.CONTENT_PUBLISH_CUTOFF) : new Date();
  const files = (await fs.readdir(directory)).filter((file) => file.endsWith(".md") && file !== "_index.md");
  const posts = (await Promise.all(files.map(async (file) => parsePost(await fs.readFile(path.join(directory, file), "utf8"), file, cutoff))))
    .filter((post): post is Post => post !== null)
    .sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));
  if (new Set(posts.map((post) => post.slug)).size !== posts.length) throw new Error("Duplicate article slug");
  return posts;
}

export async function renderMarkdown(content: string) {
  // remark-math recognizes $...$ and $$...$$. Older articles may use the
  // equivalent TeX delimiters \(...\) and \[...\], so normalize those first.
  const normalizeFormula = (formula: string) => formula
    // Article Markdown often escapes TeX punctuation so it survives Markdown
    // processing. Inside a math span those escapes would make `_` and `=`
    // literal text, preventing subscripts and normal operators from rendering.
    .replace(/\\([_=])/g, "$1");
  const normalizedContent = content
    .replace(/\\\[([\s\S]*?)\\\]/g, (_, formula: string) => `$$\n${normalizeFormula(formula)}\n$$`)
    .replace(/\\\(([\s\S]*?)\\\)/g, (_, formula: string) => `$${normalizeFormula(formula)}$`);
  const headings: Heading[] = [];
  const result = await unified().use(remarkParse).use(remarkGfm).use(remarkMath)
    .use(remarkRehype).use(rehypeSanitize, {
      ...defaultSchema,
      attributes: {
        ...defaultSchema.attributes,
        code: [["className", /^language-./, "math-inline", "math-display"]],
      },
    }).use(rehypeKatex).use(rehypeSlug, { prefix: "heading-" })
    .use(() => (tree: Root) => {
      const ids = new Set<string>();
      visit(tree, "element", (node) => {
        if (/^h[1-6]$/.test(node.tagName)) ids.add(String(node.properties.id));
      });
      visit(tree, "element", (node) => {
        const href = node.properties.href;
        if (node.tagName === "a" && typeof href === "string" && href.startsWith("#")) {
          try {
            const target = decodeURIComponent(href.slice(1));
            if (!ids.has(target) && ids.has(`heading-${target}`)) node.properties.href = `#heading-${target}`;
          } catch { /* Ignore malformed fragments. */ }
        }
        if (/^h[2-4]$/.test(node.tagName)) headings.push({ id: String(node.properties.id), text: toText(node), level: Number(node.tagName[1]) });
        if (node.tagName === "img") { node.properties.loading = "lazy"; node.properties.decoding = "async"; }
      });
    }).use(rehypeHighlight, { detect: false }).use(rehypeStringify).process(normalizedContent);
  return { html: String(result), headings };
}

export const PAGE_SIZE = 6;
export type PostFilters = { q?: string; tag?: string; category?: string; year?: string; page?: string };
export function normalizeFilters(posts: Post[], filters: PostFilters): PostFilters {
  const match = (value: string | undefined, options: string[]) => {
    const trimmed = value?.trim() || "";
    return options.find((option) => option.toLocaleLowerCase("zh-CN") === trimmed.toLocaleLowerCase("zh-CN")) ?? trimmed;
  };
  return { ...filters, q: filters.q?.trim(),
    tag: match(filters.tag, posts.flatMap((post) => post.tags)),
    category: match(filters.category, posts.flatMap((post) => post.categories)), year: filters.year?.trim() };
}
export function filterPosts(posts: Post[], filters: PostFilters) {
  const normalize = (value: string) => value.trim().toLocaleLowerCase("zh-CN");
  const query = normalize(filters.q || "");
  const matches = posts.filter((post) =>
    (!query || normalize([post.title, post.summary, ...post.tags, ...post.categories].join(" ")).includes(query)) &&
    (!filters.tag || post.tags.some((tag) => normalize(tag) === normalize(filters.tag!))) &&
    (!filters.category || post.categories.some((category) => normalize(category) === normalize(filters.category!))) &&
    (!filters.year || formatDate(post.date).startsWith(filters.year)));
  const totalPages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
  const requestedPage = /^\d+$/.test(filters.page || "") ? Number(filters.page) : 1;
  const page = Math.max(1, Math.min(totalPages, requestedPage));
  return { posts: matches.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), total: matches.length, totalPages, page };
}
export function postUrl(post: Pick<Post, "slug">) { return `/posts/${encodeURIComponent(post.slug)}/`; }
export function formatDate(date: string) {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(date));
}
