---
title: "Self-Adaptation through Incremental Generative Model Transformations at
  Runtime "
date: 2026-07-03T18:01:00.000+08:00
draft: false
summary: ""
tags:
  - ICSE
categories:
  - 论文研读
---
论文链接：https://dl.acm.org/doi/abs/10.1145/2568225.2568310

## 论文主旨

**发表于2014 ICSE，主要研究self-adaptive system。**

在传统软件工程系统中，需求分析负责研究需要解决的问题，而架构设计主要研究如何解决好问题。但在系统上线部署后，环境、负载和用户需求不是一成不变，架构和需求需要在运行时进行调整，需要设计动态变化的self-adaptive system。

现有的两种主流方法存在明显缺陷：

* 需求驱动的自适应理想地认为一个需求可以映射到一个具体的架构元素，然而现实的业务需求和架构组件之间的关系驳杂

* 架构驱动的自适应认为需求不会改变，只需要在运行时调整参数或者重构即可。然而现实需求是动态变化的，需要在运行时动态调整

故针对上述问题，该论文提出了”架构设计决策模型“，用作沟通需求层和架构层的桥梁，将其有机结合起来，在运行时进行动态适应，并通过QVT-R脚本自动进行增量模型变换。

## 出发点

现实生产环境不是一成不变的，具体业务需求也是动态变化的，故运行时的自适应需要从两方面考虑：具体业务需求和系统架构及技术决策。已有方法要么只从具体业务需求出发，要么只从架构出发，这两种方法都存在缺陷。需求和架构之间不是一对一的简单映射，而是杂糅的多对多关系，中间还包含设计决策知识。

如网购系统的促销活动会导致短时间内流量暴涨，请求数暴增，拖慢响应时间甚至导致后台服务宕机。这时有两种自适应思路：

* 系统架构和技术层面的优化：并发优化，负载均衡等

* 具体业务需求的调整和目标降级：限制接口的QPS，给高频请求的IP设置冷却时间等

该论文认为运行时自适应应该有机结合上述两种不同层级的决策，即有机结合架构层和需求层。

## 创新点

### DesignDecisionsModel
提出了一个运行时自适应框架，包括需求层、设计决策层和架构层。通过引入设计决策层，将需求目标和架构调整方案链接起来。设计决策层的模型如下：

![](/img/posts/self-adaptation-fig3.png)

- 需求层中的HardGoal(如订单验证)、SoftGoal(如响应速率)和Task统一抽象为Intention，通过MotivationLink关联到DesignIssue，链接具体设计问题和需求目标；DesignIssue(如日志)下有多个DesignOption(如日志级别)；同时DesignOption又通过ImpackLink影响SoftGoal(不同方案对速率、安全性等有不同影响)；Context和DependencyLink用于约束设计决策的搜索空间，InterferenceLink用于约束架构变换的执行顺序。

- 系统可通过"Intention -> DesignIssue -> DesignOption -> ArchitecturalModification"链路，联通需求层和架构层，先选出更合适的目标规格和设计方案，再将其映射为具体的架构变换。

### 新的最优目标规范选择策略
传统的最优目标规范是所有的软目标满意度加权和最大的哪个，该论文认为专注提高整体质量满意度容易导致个别软目标满意度极低，不利于构建高可用的、健壮的系统。故该论文使用了新的策略：优先满足尽可能多的软目标期望，即优先选择N-Score最高的目标规范，并列时选择P-Score最高的目标规范。该策略能够选出与预计期望的缺口最小的方案，即最稳定、健壮的方案。

- 负偏差得分N-Score = sum(pref(g) * Δ(g, GS)) in (Δ(g, GS) < 0) ，即任意软目标(g)在对应GS(目标规范)的缺口值的加权和

- 正偏差得分P-Score = sum(pref(g) * Δ(g, GS)) in (Δ(g, GS) > 0) ，即任意软目标(g)在对应GS(目标规范)的超额收益的加权和

## 方法流程

以文中的在线购物系统为例。

![](/img/posts/self-adaptation-fig2.png)

### 1.RunningSystem

监控运行时质量值以及上下文值，获得原始数据信息。

* 质量值Q_t = (吞吐量, 响应时间, 支付响应, 校验响应, 资源占用, ...)
* 上下文值C_t = (并发请求数, 工作负载水平, ...)
* 运行时监控数据R_t = (Q_t, C_t)

输出RuntimeData(R_t)

### 2.AnalyzerEngine

根据RuntimeData进行聚合分析，更新软目标期望向量E_t(初试值E_0人工预设)，并生成适应请求。

* 输入数据为：R_t = (Q_t, C_t)
* 软目标期望向量E_t = {exp_t(g1), exp_t(g2), ..., exp_t(gn)}
* exp_t(gi)表示时刻t对软目标(gi)的期望满足水平，exp_t(gi) in \[-1, 1]
* 适应请求AR_t = (E_t, C_t)

发送AdaptationRequest(AR_t)给决策模块

### 3.DesignDecisionsAdaptationManager

设计决策模块首先在当前需求规格不变的前提下，基于设计决策模型搜索最优设计方案。

* 输入数据为：AR_t = (E_t, C_t)
* 偏差值Δ(g, DS) = sat(g, DS) - exp_t(g)，即在设计方案DS下，任意软目标(g)与期望的差值
* 负偏差得分N-Score = sum(pref(g) * Δ(g, GS)) in (Δ(g, GS) < 0) ，即任意软目标(g)在对应GS(目标规范)的缺口值的加权和
* 正偏差得分P-Score = sum(pref(g) * Δ(g, GS)) in (Δ(g, GS) > 0) ，即任意软目标(g)在对应GS(目标规范)的超额收益的加权和
* 最优设计方案DS* = argmax_{DS in F} (N(DS), P(DS))，即在满足约束的设计方案中，优先选择N-Score最大的，并列时选择P-Score最大的

**找到DS\*时，直接输出DesignSolution(DS\*)给TransformationGenerator；否则进行需求适应，重新选择更合适的目标规格。**

### 4.RequirementsAdaptationManager

当设计决策模块在当前需求规格下无法找到可行设计方案时，需求适应模块被触发，在目标模型中重新选择更合适的目标规格。

* 输入数据为：目标模型(GM)、软目标期望向量(E_t)、软目标偏好权重(pref(g))
* 候选目标规格GS = {t1, t2, ..., tk}，ti 表示一个叶子任务
* 最优目标规格GS*选择策略与最优设计方案一致

**找到GS*时，将其返回给DesignDecisionsAdaptationManager，重新搜索最优设计方案；否则结束本轮适应，不执行新的调整。**

### 5.TransformationGenerator

当获得新的设计方案DS*后，根据旧设计方案与新设计方案之间的差异，自动生成 QVT-R 模型变换脚本。

* 输入数据为：旧设计方案DS_old，新设计方案DS_new
* 根据方案差异进行计算：

  * O_remove = DS_old \ DS_new
  * O_add = DS_new \ DS_old
  * O_keep = DS_old ∩ DS_new
  * 干扰关系集合I = all_(oi, oj)，即oi的修改可能影响oj的修改的关系对
* 通过干扰关系集合I进行执行顺序限制，使用类似拓扑排序思维的算法对操作进行排序(C(oi, oj)：当oi不是任何干扰边的target或所有干扰oi的source都不在当前集合中时)，最终得到不会互相干扰的执行顺序

输出有序的ModelTransformationScripts T = {t1, t2, t3 ... tk}

### 6.ArchitectureTransformer

架构变换模块按照顺序执行ModelTransformationScripts，对当前运行时架构模型进行增量式变换。

* 输入数据为：当前架构模型(M)，模型变换脚本(T)
* 按脚本顺序执行t1, t2, ... tk, 将M转换为M*

输出AdaptedModel(M*)

### 7.ExecutionEngine

执行模块根据变换前后的架构模型差异，对真实运行系统进行重构与重配置。

* 输入数据为：当前架构模型(M)，变换后架构模型(M*)
* 模型差异ΔM = M* - M，其可能包含add/remove component, add/remove link, turn parameter value
* 将脚本语句映射成具体的系统操作并执行

最终完成运行时架构变换 、

## 局限

* 论文的方法依赖三个预设模型：GoalModel、DesignDecisionsModel和ArchitectureModel，只能自适应处理预期内的新需求，无法应对预期之外的新需求。因此不能自动生成真正的新架构设计，只是在预设的解空间范围内自适应地构建最适合当前需求的架构，属于闭世界的自适应方法。
* DesignDecisionsModel依赖人工维护，需要预先根据设计决策方法建立对应的设计决策模型，无法自动构建。
* 搜索空间可能组合爆炸导致OOM。GoalModel中只要OR分解变多，可能的GoalSpecifications就会迅速增长；设计决策层同理。
