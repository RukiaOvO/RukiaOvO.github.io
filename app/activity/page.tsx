import type { Metadata } from "next";
import { site } from "@/lib/site";
import { ActivityFeed } from "@/components/activity-feed";

export const metadata: Metadata = { title: "动态", description: site.activity.description, alternates: { canonical: "/activity/" } };
export default function Activity() {
  return <>
    <header className="page-intro"><p className="eyebrow">BUILDING & READING</p><h1>{site.activity.title}</h1><p>一边动手，一边保持好奇。这里记录开发足迹，也收集来自技术社区的新鲜想法。</p></header>
    <div className="activity-grid">
      <section className="panel"><p className="eyebrow">IN THE OPEN</p><h2>开发足迹</h2><p className="muted">代码、讨论和每一次小小的进展。</p><ActivityFeed kind="github" /></section>
      <section className="panel"><p className="eyebrow">READING THE WORLD</p><h2>阅读雷达</h2><p className="muted">来自科技与工程社区的公开订阅。点击标题阅读原文。</p><ActivityFeed kind="rss" /></section>
    </div>
  </>;
}
