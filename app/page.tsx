import Image from "next/image";
import Link from "next/link";
import { site } from "@/lib/site";
import { getPosts } from "@/lib/posts";
import { PostCard } from "@/components/post-card";
import { Heatmap } from "@/components/heatmap";
import { Comments } from "@/components/comments";
import { WeatherSteam } from "@/components/weather-steam";
import { MarketQuotes } from "@/components/market-quotes";

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
      <MarketQuotes />
      <WeatherSteam />
    </aside>
    <div className="dashboard-content">
      <section className="dashboard-section" aria-labelledby="contributions-title"><div className="section-heading"><div><p className="eyebrow">GITHUB</p><h2 id="contributions-title">Commit 热力图</h2></div><a href={`https://github.com/${site.github.username}`} target="_blank" rel="noreferrer">GitHub ↗</a></div>
        <Heatmap src={`${site.github.heatmapProvider}/${site.github.heatmapColor}/${site.github.username}`} username={site.github.username} />
      </section>
      <section className="dashboard-section" aria-labelledby="recent-posts"><div className="section-heading"><div><p className="eyebrow">RECENT POSTS</p><h2 id="recent-posts">近期博客</h2></div><Link href="/posts/">全部博客 ↗</Link></div>
        {posts.length ? posts.map((post) => <PostCard key={post.slug} post={post} />) : <p className="empty-state">博客正在整理中。</p>}
      </section>
      <div className="dashboard-section dashboard-comments"><Comments config={site.comments} autoLoad /></div>
    </div>
  </div>;
}
