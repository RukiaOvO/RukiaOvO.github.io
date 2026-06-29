---
title: "Takagi3-QQ-Bot"
date: 2026-06-29
draft: false
summary: "一个基于 Spring Boot、LLOneBot 与 Shiro 框架实现的 QQ Bot，采用插件化方式组织自动回复、图片、基础功能与 LLM 能力。"
tags: ["Spring Boot", "QQ Bot", "OneBot", "Plugin Architecture"]
categories: ["Bot"]
---

`Takagi3-QQ-Bot` 是一个围绕 QQ 机器人能力展开的实践项目。它基于 **Spring Boot 3** 构建，结合 **LLOneBot / Shiro** 所在的机器人生态，把消息处理、插件功能、缓存和部分持久化能力组织成一套可以持续扩展的 Bot 服务。

从代码结构来看，这个项目的特点不只是“能回复消息”，而是把机器人能力拆成了更清楚的模块：

- 插件层包含 **AutoReply、AnimeImg、BasicFunc、LlmPlugin** 等独立功能模块
- 配置层单独管理 **Redis、MySQL、LevelDB** 等依赖
- 消息流经由拦截器与工具类处理，便于统一接入和后续扩展
- 依赖中已经体现出对 **WebSocket、缓存、数据库、LLM 相关能力** 的整合意图

和很多“脚本式 Bot”相比，这个项目更偏向 **工程化的机器人实现**：它不是把所有逻辑堆在一个入口文件里，而是用 Spring Boot 的方式去组织配置、插件、常量、服务和消息处理流程。

如果用主页展示语言来描述，`Takagi3-QQ-Bot` 代表的是我对 **插件化 QQ Bot 架构、消息驱动交互以及 Bot 工程实践** 的一次系统性尝试。
