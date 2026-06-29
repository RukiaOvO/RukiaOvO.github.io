---
title: "个人主页上线前检查清单"
date: 2026-06-29
draft: false
summary: "整理 Hugo 个人站在正式发布前需要检查的配置、内容和部署项。"
tags: ["Checklist", "Deployment"]
categories: ["Notes"]
---

正式上线前，建议至少检查下面这些事项：

- `baseURL` 是否与最终 GitHub Pages 地址一致
- GitHub Pages 的 Source 是否设置为 `GitHub Actions`
- 仓库是否包含主题子模块
- 页面标题、菜单、作者信息是否仍有占位内容
- 首页、关于页、项目页、文章页是否都能正常访问
- 本地 `hugo --gc --minify` 是否能成功构建

如果后续要绑定自定义域名，还要额外配置 `CNAME`、DNS 记录和 HTTPS。
