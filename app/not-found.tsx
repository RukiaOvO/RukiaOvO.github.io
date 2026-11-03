import Link from "next/link";
export default function NotFound() {
  return <section className="empty-state page-intro"><p className="eyebrow">404 / A LITTLE DETOUR</p><h1>这里还没有内容</h1><p>页面可能已移动，或博客尚未发布。</p><Link className="button" href="/posts/">浏览博客</Link></section>;
}
