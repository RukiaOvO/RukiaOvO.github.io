import Image from "next/image";
import Link from "next/link";
import { site } from "@/lib/site";
import { getPosts } from "@/lib/posts";
import { PostCard } from "@/components/post-card";
import { ActivityFeed } from "@/components/activity-feed";
import { Heatmap } from "@/components/heatmap";
import { Comments } from "@/components/comments";

export default async function Home() {
  const posts = (await getPosts()).slice(0, 3);
  const { profile } = site;
  return <div className="profile-dashboard">
    <aside className="dashboard-sidebar" aria-label="个人信息">
      <section className="panel dashboard-profile">
        <Image src={`/${profile.avatar}`} alt={profile.displayName} width={240} height={240} priority className="dashboard-avatar" />
        <div className="dashboard-identity"><h1>{profile.displayName}</h1><p className="profile-handle">{profile.romanName} <span>· @{profile.github}</span></p><p className="muted">{profile.bio}</p></div>
        <div className="social-links">{site.social.map((link) => <a key={link.label} href={link.href} target={link.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer">{link.label}<span aria-hidden="true">↗</span></a>)}</div>
      </section>
      <section className="panel dashboard-info" aria-label="个人资料与技能">
        <dl><div><dt>学校</dt><dd>{profile.role}</dd></div><div><dt>城市</dt><dd>{profile.location}</dd></div><div><dt>研究方向</dt><dd>{profile.research}</dd></div></dl>
        <div className="tags skills">{site.skills.map((skill) => <span key={skill}>{skill}</span>)}</div>
      </section>
      <section className="panel dashboard-links"><p className="eyebrow">QUICK ACCESS</p><h2>常用入口</h2><Link href="/activity/">动态与订阅 <span aria-hidden="true">→</span></Link><Link href="/admin/">写作与上传 <span aria-hidden="true">→</span></Link><a href="/posts/index.xml">订阅我的文章 <span aria-hidden="true">↗</span></a><Link href="/about/">关于我与时间线 <span aria-hidden="true">→</span></Link></section>
    </aside>
    <div className="dashboard-content">
      <section className="dashboard-section" aria-labelledby="contributions-title"><div className="section-heading"><div><p className="eyebrow">GITHUB</p><h2 id="contributions-title">Commit 热力图</h2></div><a href={`https://github.com/${site.github.username}`} target="_blank" rel="noreferrer">GitHub ↗</a></div>
        <Heatmap src={`${site.github.heatmapProvider}/${site.github.heatmapColor}/${site.github.username}`} username={site.github.username} />
      </section>
      <section className="dashboard-section" aria-labelledby="recent-posts"><div className="section-heading"><div><p className="eyebrow">RECENT POSTS</p><h2 id="recent-posts">近期文章</h2></div><Link href="/posts/">全部文章 ↗</Link></div>
        {posts.length ? posts.map((post) => <PostCard key={post.slug} post={post} />) : <p className="empty-state">文章正在整理中。</p>}
      </section>
      <section className="dashboard-section" aria-labelledby="selected-work"><div className="section-heading"><div><p className="eyebrow">PINNED PROJECTS</p><h2 id="selected-work">精选项目</h2></div><Link href="/projects/">全部项目 ↗</Link></div>
        <div className="pinned-projects">{site.projects.map((project) => <article key={project.slug} className="pinned-project"><h3><a href={project.href} target="_blank" rel="noreferrer"><span aria-hidden="true">⌘</span> {project.name} ↗</a></h3><p>{project.description}</p><div className="tags">{project.tags.map((tag) => <span key={tag}>{tag}</span>)}</div></article>)}</div>
      </section>
      <section className="dashboard-section home-bottom" aria-labelledby="recent-activity"><div className="section-heading"><div><p className="eyebrow">PUBLIC ACTIVITY</p><h2 id="recent-activity">最近的开发足迹</h2></div><Link href="/activity/">更多动态 ↗</Link></div><ActivityFeed kind="github" compact /></section>
      <div className="dashboard-section dashboard-comments"><Comments config={site.comments} /></div>
    </div>
  </div>;
}
