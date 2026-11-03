// New site's editorial configuration. Independent of Hugo's data/home.yaml.
export const siteContent = {
  profile: {
    siteTitle: "Ruk1a · 代码、阅读与思考", displayName: "露琪亚", romanName: "Ruk1a",
    role: "Fudan University", location: "Shanghai", avatar: "img/avatar.jpg",
    github: "RukiaOvO", email: "1403555427@qq.com", bio: "无风去处是归宿",
    research: "Agent / AI4SE", introduction: "在复旦学习，关注软件工程、Agent 与 AI4SE。这里整理我的工程实践、论文阅读，以及沿途的思考。",
  },
  navigation: [{ label: "首页", href: "/" }, { label: "博客", href: "/posts/" },
    { label: "动态", href: "/activity/" }],
  social: [
    { label: "GitHub", href: "https://github.com/RukiaOvO" },
    { label: "Email", href: "mailto:1403555427@qq.com" },
    { label: "Bilibili", href: "https://space.bilibili.com/102770566" },
    { label: "X", href: "https://x.com/Ruk1aOvO" },
    { label: "Steam", href: "https://steamcommunity.com/profiles/76561198417009401/" },
    { label: "QQ", href: "https://wpa.qq.com/msgrd?v=3&uin=1403555427&site=qq&menu=yes" },
  ],
  skills: ["AI4SE", "Agent Trajectory", "RCA", "Agentic RL"],
  timeline: [
    { date: "2026.06", title: "整理工程实践与论文阅读，建设个人主页" },
    { date: "2026.07", title: "持续关注 Agent / AI4SE 与软件工程结合" },
    { date: "2026.08", title: "在 Fudan University 开始新的阶段" },
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
  weather: {
    defaultCity: "上海",
    cities: [
      { label: "上海", latitude: 31.2304, longitude: 121.4737 },
      { label: "北京", latitude: 39.9042, longitude: 116.4074 },
      { label: "广州", latitude: 23.1292, longitude: 113.2644 },
      { label: "深圳", latitude: 22.5431, longitude: 114.0579 },
      { label: "杭州", latitude: 30.2741, longitude: 120.1551 },
      { label: "成都", latitude: 30.5728, longitude: 104.0664 },
      { label: "南京", latitude: 32.0603, longitude: 118.7969 },
      { label: "武汉", latitude: 30.5928, longitude: 114.3055 },
      { label: "泉州", latitude: 24.8741, longitude: 118.6757 },
    ],
  },
  steam: {
    profileUrl: "https://steamcommunity.com/profiles/76561198417009401/",
    workerUrl: "https://rukiaovo-github-io.1403555427.workers.dev/steam",
    recentGamesUrl: "https://rukiaovo-github-io.1403555427.workers.dev/steam/games",
  },
  comments: {
    owner: "RukiaOvO", repo: "RukiaOvO.github.io", title: "留下一点想法", description: "关于博客、项目，或任何想聊的话题。欢迎交流。",
    giscus: { enabled: true, repoId: "R_kgDOTIGanw", category: "General", categoryId: "DIC_kwDOTIGan84DAQuk",
      mapping: "pathname" as const, strict: "0", reactionsEnabled: "0", emitMetadata: "0", inputPosition: "bottom", lang: "zh-CN" },
  },
  posts: { title: "博客", description: "论文阅读、工程实践，以及值得留下的思考。" },
  activity: { title: "动态与阅读", description: "公开开发记录，与来自技术社区的阅读线索。" },
};

export type Project = typeof siteContent.projects[number];
