---
title: Extracting Conceptual Knowledge to Locate Software Issues
date: 2026-07-01T22:12:00.000+08:00
draft: false
tags:
  - SE
categories:
  - 论文研读
---
论文链接：https://arxiv.org/abs/2509.21427

## 论文主旨
主要研究如何增强LLM的根据bug/issue定位相关文件或代码的能力，提出了一种类似GraphRAG思想的issue localization增强方案。

该论文认为，目前的LLM在代码仓库中定位bug/issue相关代码或函数的能力不足，经常失效。这是因为LLM主要关注具体的文件、代码、函数，缺少了宏观的整体视角。一个业务的具体逻辑经常混杂在复杂的函数内部，又分割在多个不同代码文件之间，LLM只关注具体代码容易忽视业务逻辑之间的联系。

因此，该论文提出了RepoLens框架，先离线构建代码仓库的概念知识库，用于增强LLM定位issue的能力，在LLM需要定位时在线检索知识库，将结果注入定位的prompt中，增强LLM根据bug/issue定位相关代码的能力。

## 出发点
Issue localization: 根据bug/issue描述，自动找出最可能出问题的相关文件或函数。

论文中提到，在真实的大项目中，问题定位很难，主要可以归结为两个现象：
- concern tangling：业务逻辑相互混杂在同一函数中，单个业务相关的逻辑只占其中一小部分
- concern scattering：一个业务对应的逻辑分散在多个函数或者文件中
即同一业务相关的逻辑常常碎片化分散在不同的函数或文件中，而同一函数又常常混杂了不同的职责和逻辑，LLM看到的是具体的代码和文件，却不容易看到这些分散的代码实则属于同一业务。

因此，该论文提出一种方法，通过离线构建概念知识库，将代码库中的相关业务逻辑重组为宏观的高层conceptual knowledge，便于LLM进行代码定位。

## 创新点
- 基于类似GraphRAG的From local to global思想，提出了更加高内聚、低耦合的concern概念，作为代码仓库与具体bug/issue描述的自然语言之间的中间表示层。不同于常规的函数或代码摘要，concern主要是业务逻辑级别的，不局限与任一函数、任一文件，只关注具体语义名词在仓库中的逻辑脉络。通过构建高层语义关注点”concern“，便于检索与bug/issue中描述相关的业务概念，并溯源定位相关的代码和文件
- 提出了两阶段框架RepoLens，类似GraphRAG的”离线构建知识图谱和社区摘要->检索图谱召回知识进行检索增强生成“。先离线构建代码仓库的conceptual knowledge库，再通过检索召回相关业务逻辑片段，嵌入定位prompt中增强LLM的bug/issue定位能力

## 方法流程
主要分为离线构建与在线检索定位两个阶段，总体流程类似GraphRAG，都存在离线构建知识库，在线检索召回提供可靠依据两阶段，最终也是将召回信息注入prompt实现检索增强。

**离线构建**：
- Term Extraction：从整个代码仓库中抽取term，即函数或变量名中的group、user、message等名词，这类名词通常是issue描述中常见的业务概念，可以作为连接具体代码实现和Issue中自然语言描述的中间层。
- Term Explanation：利用LLM对每个term进行语义增强，主要包括拓展并规范term的名称、解释term的含义、总结代码中与term相关的功能语义、抽取相关的代码片段作为依据。
- Knowledge Base Construction：将上述处理后的term信息组织成结构化的数据，构建一个仓库级的概念知识库。

**在线检索定位**：
- Bug/Issue Keyword extraction：从issue的标题中提取关键词，重点提取其中的名词。
- Term Retrieval：通过提取的关键词，在离线构建的知识库中检索相关的term。通过使用n-gram分解，尽可能地召回与issue相关的概念。
- Concern Clustering：使用层次聚类方法先做预聚类，结合term中属性的向量相似度和函数之间的调用关系，将候选term划分为较小子集；再使用LLM分析其中的功能关联，聚合成高层的concern，并生成concern summary。
- Concern Ranking：先基于语义向量相似度对concern进行粗筛，选出top-50 concerns，在使用LLM结合issue的标题和内容对concern做精排，最终召回top-10 concerns。
- Prompt Building：将召回的concerns组织成结构化上下文，注入LLM/Agent的issue localization prompt中。
