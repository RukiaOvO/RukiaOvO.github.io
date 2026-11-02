import Link from "next/link";
import { formatDate, postUrl, type Post } from "@/lib/posts";

export function PostCard({ post }: { post: Post }) {
  return <article className="post-card">
    <div className="meta"><time dateTime={post.date}>{formatDate(post.date)}</time><span>{post.categories.join(" / ")}</span><span>{post.minutes} 分钟阅读</span></div>
    <h2><Link href={postUrl(post)}>{post.title}</Link></h2>
    <p>{post.summary}</p>
    <div className="tags">{post.tags.map((tag) => <Link key={tag} href={`/posts/?tag=${encodeURIComponent(tag)}`}># {tag}</Link>)}</div>
  </article>;
}
