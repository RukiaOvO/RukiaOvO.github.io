# RukiaOvO.github.io

这是我的个人主页项目，基于 Hugo 构建，站点内容围绕个人介绍、项目展示、技术文章入口和动态聚合展开。页面采用自定义模板覆盖默认主题行为，并结合本地数据文件与前端脚本实现首页的实时信息展示。

## 项目概述

这个仓库不是面向他人二次部署的开源模板，而是我自己的长期维护主页。项目核心目标是把个人信息、项目沉淀、公开动态和外部信息流统一放在一个可持续更新的静态站点里。

当前站点主要包含：

- 首页个人面板
- 项目列表与项目详情页
- 动态聚合页
- 文章 / 记录类内容入口
- 基础 SEO、站点地图、RSS 等静态站点能力

## 功能简介

- 首页展示个人信息、头像、技能标签和社交入口
- 首页集成 GitHub 热力图、天气、Steam 状态和留言区
- Steam 状态通过 Cloudflare Worker 提供实时数据
- GitHub 动态与外部 RSS/Stream 内容通过本地静态数据和前端脚本同步展示
- 支持中文与英文内容结构
- 支持文章、项目、动态等不同内容页的独立布局

## 文件架构

- `content/`：站点内容，包含首页入口、关于页、项目页、文章页等
- `data/home.yaml`：主页数据源，维护个人资料、社交链接、天气城市、RSS 源、Steam 配置等
- `layouts/`：Hugo 模板覆盖层
  - `layouts/partials/home/`：首页各个模块的模板
  - `layouts/posts/`：文章列表页
  - `layouts/activity/`：动态聚合页
  - `layouts/_default/`：默认页模板
- `assets/`：前端资源
  - `assets/css/`：自定义样式
  - `assets/js/`：首页交互脚本
  - `assets/img/`：图片资源
- `static/data/`：构建后或外部同步使用的静态 JSON 数据
- `scripts/`：数据更新脚本
- `workers/`：Cloudflare Worker 相关代码
- `config/_default/`：站点配置与多语言配置
- `themes/blowfish/`：主题子模块

## 说明

本仓库仅记录站点实现与内容组织方式，不提供独立部署教程或对外部复刻的操作说明。
