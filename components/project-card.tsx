import type { Project } from "@/data/site";

export function ProjectCard({ project }: { project: Project }) {
  return <article className={`project-card project-${project.visual}`}>
    <div className="project-art" aria-hidden="true">
      <span className="art-number">{project.number}</span>
      {project.visual === "graph" ? <svg viewBox="0 0 440 170" fill="none">
        <path d="M84 96L163 42L235 90L332 37M84 96L177 142L235 90L354 132M163 42L177 142M235 90L332 37L354 132" stroke="currentColor" strokeWidth="1" opacity=".35" />
        {[[84,96],[163,42],[235,90],[332,37],[177,142],[354,132]].map(([x,y], index) => <g key={index}><circle cx={x} cy={y} r={index === 2 ? 22 : 12} fill="var(--art-node)" stroke="currentColor" strokeWidth="1" /><circle cx={x} cy={y} r="3" fill="currentColor" /></g>)}
        <text x="266" y="96" fill="currentColor" fontSize="10" letterSpacing="2">CONNECT THE DOTS</text>
      </svg> : <div className="paper-stack"><div className="paper-back"/><div className="paper-front"><span>FIELD NOTES</span><i/><i/><i/><strong>ideas → words</strong></div></div>}
    </div>
    <div className="project-copy"><p className="eyebrow">{project.eyebrow}</p><h3><a href={project.href} target="_blank" rel="noreferrer">{project.name}<span aria-hidden="true">↗</span></a></h3><p>{project.description}</p>
      <div className="tags">{project.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
    </div>
  </article>;
}
