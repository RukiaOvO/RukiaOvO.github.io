import type { Metadata } from "next";
import { site } from "@/lib/site";
import { ProjectCard } from "@/components/project-card";

export const metadata: Metadata = { title: "项目", description: "从知识图谱到个人站点，记录软件工程中的探索与实践。", alternates: { canonical: "/projects/" } };
export default function Projects() {
  return <><header className="page-intro"><p className="eyebrow">SELECTED WORK / OPEN SOURCE</p><h1>想法的另一种形状<span className="accent">。</span></h1><p>把学习中的问题，变成可以运行、可以改进的东西。</p></header>
    <div className="project-grid">{site.projects.map((project) => <ProjectCard key={project.slug} project={project} />)}</div>
    <div className="projects-footer"><p>更多代码与探索，持续记录在 GitHub。</p><a className="button button-outline" href={`https://github.com/${site.github.username}?tab=repositories`} target="_blank" rel="noreferrer">浏览公开仓库 ↗</a></div>
  </>;
}
