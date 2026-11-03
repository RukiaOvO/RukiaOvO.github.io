import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPosts, postUrl, renderMarkdown, formatDate } from "@/lib/posts";
import { absoluteUrl, site } from "@/lib/site";
import { ArticleBody } from "@/components/article-body";
import { Comments } from "@/components/comments";

type Props = { params: Promise<{ slug: string }> };
export const dynamicParams = false;
export async function generateStaticParams() { return (await getPosts()).map((post) => ({ slug: post.slug })); }
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = (await getPosts()).find((item) => item.slug === slug);
  if (!post) notFound();
  return { title: post.title, description: post.summary, alternates: { canonical: postUrl(post) },
    openGraph: { type: "article", title: post.title, description: post.summary, url: postUrl(post),
      publishedTime: post.date, authors: [site.profile.displayName], tags: post.tags,
      images: [{ url: absoluteUrl("/img/avatar.jpg"), alt: site.profile.displayName }] } };
}
export default async function PostPage({ params }: Props) {
  const { slug } = await params;
  const posts = await getPosts();
  const index = posts.findIndex((post) => post.slug === slug);
  if (index < 0) notFound();
  const post = posts[index];
  const { html, headings } = await renderMarkdown(post.content);
  const older = posts[index + 1];
  const newer = posts[index - 1];
  const schema = { "@context": "https://schema.org", "@type": "BlogPosting", headline: post.title,
    description: post.summary, datePublished: post.date, mainEntityOfPage: absoluteUrl(postUrl(post)),
    author: { "@type": "Person", name: site.profile.displayName, url: absoluteUrl("/") } };
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />
    <header className="article-header"><Link href="/posts/" className="back-link">← 返回博客</Link><div className="meta"><time dateTime={post.date}>{formatDate(post.date)}</time><span>{post.minutes} 分钟阅读</span></div><h1>{post.title}</h1>
      <div className="tags">{post.categories.map((category) => <Link key={category} href={`/posts/?category=${encodeURIComponent(category)}`}>{category}</Link>)}{post.tags.map((tag) => <Link key={tag} href={`/posts/?tag=${encodeURIComponent(tag)}`}># {tag}</Link>)}</div>
    </header>
    <div className="article-layout"><article className="panel article-panel"><ArticleBody html={html} /></article>
      {headings.length > 0 && <aside className="toc panel" aria-label="博客目录"><p className="eyebrow">ON THIS PAGE</p><h2>目录</h2><ol>{headings.map((heading) => <li key={heading.id} data-level={heading.level}><a href={`#${heading.id}`}>{heading.text}</a></li>)}</ol></aside>}
    </div>
    <nav className="post-pagination" aria-label="相邻博客">{older && <Link href={postUrl(older)}><span>← 上一篇</span><strong>{older.title}</strong></Link>}{newer && <Link href={postUrl(newer)}><span>下一篇 →</span><strong>{newer.title}</strong></Link>}</nav>
    <Comments config={site.comments} />
  </>;
}
