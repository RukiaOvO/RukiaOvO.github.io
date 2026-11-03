import type { Metadata } from "next";
import Link from "next/link";
import { PostCard } from "@/components/post-card";
import { getPosts, filterPosts, formatDate, normalizeFilters, type PostFilters } from "@/lib/posts";
import { isPreview, site } from "@/lib/site";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams;
  return { title: "博客", description: site.posts.description, alternates: { canonical: "/posts/" },
    ...(isPreview ? { robots: { index: false, follow: false } } : Object.keys(params).length ? { robots: { index: false, follow: true } } : {}) };
}
export default async function Posts({ searchParams }: Props) {
  const params = await searchParams;
  const raw: PostFilters = Object.fromEntries(["q", "tag", "category", "year", "page"].map((name) => [name, typeof params[name] === "string" ? params[name] : ""]));
  const all = await getPosts();
  const filters = normalizeFilters(all, raw);
  const result = filterPosts(all, filters);
  const tags = [...new Set(all.flatMap((post) => post.tags))].sort();
  const categories = [...new Set(all.flatMap((post) => post.categories))].sort();
  const years = [...new Set(all.map((post) => formatDate(post.date).slice(0, 4)))].sort().reverse();
  if (filters.tag && !tags.includes(filters.tag)) tags.push(filters.tag);
  if (filters.category && !categories.includes(filters.category)) categories.push(filters.category);
  if (filters.year && !years.includes(filters.year)) years.push(filters.year);
  function pageHref(page: number) {
    const query = new URLSearchParams(Object.entries(filters).filter(([key, value]) => key !== "page" && !!value) as [string, string][]);
    query.set("page", String(page));
    return `/posts/?${query}`;
  }
  return <>
    <header className="page-intro"><p className="eyebrow">THE NOTEBOOK</p><h1>{site.posts.title}</h1><p>{site.posts.description}</p></header>
    <section className="panel" aria-label="搜索与筛选">
      <form key={JSON.stringify(filters)} action="/posts/" method="get" className="filters">
        <label className="search-field">搜索博客<input type="search" name="q" placeholder="搜索标题、摘要或标签…" defaultValue={filters.q} /></label>
        <label>分类<select name="category" defaultValue={filters.category}><option value="">全部分类</option>{categories.map((value) => <option key={value}>{value}</option>)}</select></label>
        <label>标签<select name="tag" defaultValue={filters.tag}><option value="">全部标签</option>{tags.map((value) => <option key={value}>{value}</option>)}</select></label>
        <label>年份<select name="year" defaultValue={filters.year}><option value="">所有年份</option>{years.map((value) => <option key={value}>{value}</option>)}</select></label>
        <button type="submit" className="button">筛选</button><Link className="reset-link" href="/posts/">重置</Link>
      </form>
    </section>
    <div className="results-heading"><p>共 {result.total} 篇博客</p><a href="/posts/index.xml">订阅 RSS ↗</a></div>
    <section className="panel posts-panel" aria-label="博客列表">{result.posts.length ? result.posts.map((post) => <PostCard key={post.slug} post={post} />) : <div className="empty-state"><h2>没有找到匹配的博客</h2><p>试试其他关键词，或清除筛选条件。</p><Link href="/posts/">查看全部博客 →</Link></div>}</section>
    <nav className="pagination" aria-label="博客分页">{result.page > 1 && <Link href={pageHref(result.page - 1)}>← 上一页</Link>}<span>第 {result.page} / {result.totalPages} 页</span>{result.page < result.totalPages && <Link href={pageHref(result.page + 1)}>下一页 →</Link>}</nav>
  </>;
}
