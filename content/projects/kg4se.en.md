---
title: "Kg4se"
date: 2026-06-29
draft: false
summary: "A multimodal knowledge graph platform I built around software engineering course scenarios, combining GraphRAG, graph visualization, and quality evaluation in one workflow."
tags: ["GraphRAG", "Knowledge Graph", "FastAPI", "Vue"]
categories: ["AI4SE"]
---

`Kg4se` is a knowledge graph platform I built around **software engineering knowledge organization and use**. The project is aimed at course and research scenarios, and I designed it to connect document parsing, knowledge extraction, graph construction, question answering, and quality evaluation into one end-to-end workflow rather than leaving it as a single feature demo.

From the repository structure and README, it is clear that I approached it as a relatively complete full-stack system:

- the frontend uses **Vue 3 + TypeScript + Vite**, together with **Naive UI, ECharts, and Cytoscape.js** for graph interaction and visualization
- the backend uses **FastAPI + Python 3.11** for document processing, knowledge extraction, the GraphRAG pipeline, and QA services
- the infrastructure includes **Neo4j, Redis, RQ, and Docker Compose**, giving the system a practical engineering base for graph storage, async processing, and local deployment

What matters most to me in this project is that I did not treat a “knowledge graph” as just database visualization. Instead, I designed a multi-stage **GraphRAG pipeline** and separated document management, graph construction, knowledge cards, QA, and evaluation into distinct modules. That gives the project both research direction and room for engineering evolution.

If I had to summarize it briefly, `Kg4se` is my attempt to **structure, graph, visualize, and further use software engineering course knowledge for question answering and analysis**, rather than building a simple graph database demo.
