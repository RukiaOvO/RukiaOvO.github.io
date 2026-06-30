export const githubConfig = {
  username: "RukiaOvO",
  eventsLimit: 20,
};

export const rssSources = [
  {
    label: "B站动态",
    category: "B站",
    rsshubPath: "/bilibili/user/dynamic/102770566",
    urls: [
      "https://rsshub.app/bilibili/user/dynamic/102770566",
      "https://rsshub.rssforever.com/bilibili/user/dynamic/102770566",
      "https://rsshub.rss.tips/bilibili/user/dynamic/102770566",
    ],
  },
  {
    label: "番剧更新",
    category: "番剧",
    rsshubPath: "/bangumi/calendar/today",
    urls: [
      "https://rsshub.app/bangumi/calendar/today",
      "https://rsshub.rssforever.com/bangumi/calendar/today",
      "https://rsshub.rss.tips/bangumi/calendar/today",
    ],
  },
  {
    label: "IT之家",
    category: "科技",
    urls: [
      "https://www.ithome.com/rss/",
      "https://rsshub.app/ithome/ranking/24h",
      "https://rsshub.rssforever.com/ithome/ranking/24h",
    ],
  },
  {
    label: "36氪快讯",
    category: "科技",
    rsshubPath: "/36kr/newsflashes",
    urls: [
      "https://rsshub.app/36kr/newsflashes",
      "https://rsshub.rssforever.com/36kr/newsflashes",
      "https://rsshub.rss.tips/36kr/newsflashes",
    ],
  },
  {
    label: "财联社电报",
    category: "股市",
    type: "clsTelegraph",
    rsshubPath: "/cls/telegraph",
    urls: [
      "https://www.cls.cn/nodeapi/telegraphList",
      "https://rsshub.app/cls/telegraph",
      "https://rsshub.rssforever.com/cls/telegraph",
      "https://rsshub.rss.tips/cls/telegraph",
    ],
  },
];
