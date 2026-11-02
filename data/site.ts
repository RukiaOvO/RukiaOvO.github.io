// New site's editorial configuration. Independent of Hugo's data/home.yaml.
export const siteContent = {
  profile: {
    siteTitle: "Ruk1a · 代码、阅读与思考", displayName: "露琪亚", romanName: "Ruk1a",
    role: "Fudan University", location: "Shanghai", avatar: "img/avatar.jpg",
    github: "RukiaOvO", email: "1403555427@qq.com", bio: "无风去处是归宿",
    research: "Agent / AI4SE", introduction: "在复旦学习，关注软件工程、Agent 与 AI4SE。这里整理我的工程实践、论文阅读，以及沿途的思考。",
  },
  navigation: [{ label: "首页", href: "/" }, { label: "文章", href: "/posts/" },
    { label: "项目", href: "/projects/" }, { label: "动态", href: "/activity/" }, { label: "关于", href: "/about/" }],
  social: [
    { label: "GitHub", href: "https://github.com/RukiaOvO" },
    { label: "Email", href: "mailto:1403555427@qq.com" },
    { label: "Bilibili", href: "https://space.bilibili.com/102770566" },
    { label: "X", href: "https://x.com/Ruk1aOvO" },
    { label: "Steam", href: "https://steamcommunity.com/profiles/76561198417009401/" },
    { label: "QQ", href: "https://wpa.qq.com/msgrd?v=3&uin=1403555427&site=qq&menu=yes" },
  ],
  skills: ["Java", "Go", "Web", "软件架构", "Agent", "AI4SE"],
  timeline: [
    { date: "2026.06", title: "整理工程实践与论文阅读，建设个人主页" },
    { date: "2026.01", title: "持续关注 Agent / AI4SE 与软件工程结合" },
    { date: "2025.09", title: "聚焦 Web、后端工程与软件架构" },
    { date: "2024.09", title: "在 Fudan University 开始新的阶段" },
  ],
  projects: [
    { slug: "kg4se", name: "Kg4se", eyebrow: "KNOWLEDGE × SOFTWARE ENGINEERING", number: "01",
      description: "面向软件工程课程的多模态知识图谱增量构建平台。探索如何组织知识，让分散的信息建立关联。",
      href: "https://github.com/RukiaOvO/Kg4se", tags: ["Python", "知识图谱", "软件工程"], visual: "graph" },
    { slug: "personal-site", name: "一个持续生长的个人站点", eyebrow: "BUILDING IN THE OPEN", number: "02",
      description: "把代码、论文笔记和日常关注放在一起。用更轻、更专注的阅读体验，记录学习与实践的过程。",
      href: "https://github.com/RukiaOvO/RukiaOvO.github.io", tags: ["Next.js", "TypeScript", "Web"], visual: "notes" },
  ],
  github: { username: "RukiaOvO", heatmapProvider: "https://ghchart.rshah.org", heatmapColor: "58a6ff" },
  comments: {
    owner: "RukiaOvO", repo: "RukiaOvO.github.io", title: "留下一点想法", description: "关于文章、项目，或任何想聊的话题。欢迎交流。",
    giscus: { enabled: true, repoId: "R_kgDOTIGanw", category: "General", categoryId: "DIC_kwDOTIGan84DAQuk",
      mapping: "pathname" as const, strict: "0", reactionsEnabled: "0", emitMetadata: "0", inputPosition: "bottom", lang: "zh-CN" },
  },
  posts: { title: "文章", description: "论文阅读、工程实践，以及值得留下的思考。" },
  activity: { title: "动态与阅读", description: "公开开发记录，与来自技术社区的阅读线索。" },
};

export type Project = typeof siteContent.projects[number];
