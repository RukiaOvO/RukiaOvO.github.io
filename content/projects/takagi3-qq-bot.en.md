---
title: "Takagi3-QQ-Bot"
date: 2026-06-29
draft: false
summary: "A QQ Bot I built with Spring Boot, LLOneBot, and Shiro, organized around a plugin-based structure for auto-reply, image features, core utilities, and LLM-related capabilities."
tags: ["Spring Boot", "QQ Bot", "OneBot", "Plugin Architecture"]
categories: ["Bot"]
---

`Takagi3-QQ-Bot` is an engineering-oriented QQ bot project I built around bot interaction and extensibility. It is based on **Spring Boot 3** and the **LLOneBot / Shiro** ecosystem, and I organized message handling, plugins, caching, and parts of the persistence layer into a bot service that can keep expanding over time.

From the code structure, my goal was not simply to make a bot that can reply to messages, but to separate its capabilities into clearer modules:

- a plugin layer with features such as **AutoReply, AnimeImg, BasicFunc, and LlmPlugin**
- a configuration layer for dependencies such as **Redis, MySQL, and LevelDB**
- message processing that flows through interceptors and utilities so later extensions stay more manageable
- dependencies that already point toward integration with **WebSocket, caching, databases, and LLM-related capabilities**

Compared with many script-style bots, I wanted this project to move toward a more **engineered bot architecture**. Instead of putting everything into one entry file, I used Spring Boot conventions to organize configuration, plugins, constants, services, and message handling flow.

In the context of this homepage, `Takagi3-QQ-Bot` represents my attempt to build a more systematic understanding of **plugin-based QQ bot architecture, message-driven interaction, and bot engineering practice**.
