import type { Metadata } from "next";
import Image from "next/image";
import { site } from "@/lib/site";
import { Comments } from "@/components/comments";
import { Heatmap } from "@/components/heatmap";

export const metadata: Metadata = { title: "关于", description: site.profile.introduction, alternates: { canonical: "/about/" } };
export default function About() {
  return <><header className="page-intro"><p className="eyebrow">A LITTLE ABOUT ME</p><h1>你好，我是{site.profile.displayName}<span className="accent">。</span></h1><p>{site.profile.bio}</p></header>
    <div className="about-grid"><section className="panel about-intro"><Image src={`/${site.profile.avatar}`} alt={site.profile.displayName} width={120} height={120} className="note-avatar" /><h2>在实践与思考之间。</h2><p>{site.profile.introduction}</p><p>喜欢把阅读中的问题带进实践，再把实践中的发现写下来。这个站点是一个持续更新的笔记本。</p><div className="tags skills">{site.skills.map((skill) => <span key={skill}>{skill}</span>)}</div><div className="social-links">{site.social.map((link) => <a key={link.label} href={link.href} target={link.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer">{link.label} ↗</a>)}</div></section>
      <section className="panel"><p className="eyebrow">ALONG THE WAY</p><h2>沿途的记录</h2><ol className="timeline">{site.timeline.map((item) => <li key={item.date}><time>{item.date}</time><p>{item.title}</p></li>)}</ol></section>
    </div>
    <section className="panel about-contributions"><p className="eyebrow">LITTLE STEPS, EVERY DAY</p><h2>持续留下的足迹</h2><Heatmap src={`${site.github.heatmapProvider}/${site.github.heatmapColor}/${site.github.username}`} username={site.github.username} /></section>
    <Comments config={site.comments} />
  </>;
}
