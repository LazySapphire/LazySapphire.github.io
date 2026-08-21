---
title: "组会讨论复盘：Action-Conditioned World Models 的 action 注入与视觉表征"
list_title: "组会复盘：AC-WM、视觉表征与 WAM"
date: "2026-08-20"
description: "记录 DreamX-Phi 介绍及组会上围绕 V-JEPA、DINOv3、3D point flow 和 WAM action-centric preprocessing 的讨论。"
math: true
status: "maintained"
topics: ["AC-WM", "WAM", "Robotic", "Representation"]
tags: ["dreamx-phi", "ac-wm", "v-jepa-2", "v-jepa-2-1", "dinov3", "point-flow", "action-injection", "action-centric-learning", "sim2real"]
categories: ["notes"]
---

## 会议定位

今天的讨论围绕一个共同问题展开：

> 对机器人任务而言，视觉表征和 action condition 应该如何组织，才能让模型真正理解“哪个东西会因为这次动作而发生变化”，而不是只生成一个看起来合理的视觉结果？

本页分开记录三种内容：

- **论文事实**：可以回到论文原文核对的内容。
- **现场观察**：组会上分享的实验现象或共同判断。
- **待验证假设**：目前还不能当作定论，需要统一协议实验。

这样做是为了避免把一次组会中的经验性判断，误写成已经被论文证明的结论。

## 论文入口：DreamX-Phi 1.0

本次介绍的论文是 [DreamX-Phi 1.0 论文阅读笔记](/papers/dreamx-phi-2608-13489/)。它研究 action-conditioned video world model，可作为 AC-WM 分支的代表，并重点处理 action 注入接口。

论文把已有方法概括为几类：

1. action token 或 embedding 拼接；
2. feature-wise modulation / adapter；
3. cross-attention；
4. 把 skeleton、robot geometry 或 optical flow 渲染成空间对齐条件；
5. DreamX-Phi 使用的结构化双臂 $SE(3)$ 轨迹 + PRoPE attention，并额外加入 robot-only flow。

我的复盘是：这些方法不只是“把 action 放到网络的不同位置”，而是在选择 action 的**语义载体**：

- token 载体：把 action 当作条件语义；
- modulation 载体：把 action 当作 feature 控制信号；
- attention 载体：把 action 当作可查询的外部状态；
- flow / geometry 载体：把 action 当作空间和运动结构；
- PRoPE 载体：把已知刚体变换直接写进 attention 的相对关系。

DreamX-Phi 的关键贡献，是把“动作的三维刚体结构”和“动作应该出现在图像哪里”拆成两个互补接口，而不是期待单个 action embedding 同时承担这两个职责。

## Insight 1：V-JEPA 2.0 与 V-JEPA 2.1

### 现场观察

组会上分享的经验是：

> V-JEPA 2.0 对机器人任务的图像表征帮助，似乎比 V-JEPA 2.1 更好；尽管 V-JEPA 2.1 强调 “unlocks high-quality dense features”。

一个可能的解释是：下游机器人任务未必需要极高的像素级或 patch-level 细节。过于 dense 的表征可能带来更多局部信息，但不一定更适合动作决策；机器人控制可能更依赖稳定、压缩、与任务状态相关的表征。

### 论文事实

V-JEPA 2.1 的设计确实主要针对 dense vision：

- dense predictive loss 同时约束 masked 和 visible tokens；
- deep self-supervision 作用在多个中间层；
- multi-modal tokenizer 让 image 和 video 以更合适的形式共同训练；
- 论文报告在 dense task、object interaction anticipation、导航、深度等方向有明显提升。

但 V-JEPA 2.1 自己的消融也显示了 trade-off：增加 context loss 会提升 dense segmentation 和 depth，同时可能损伤动作识别和全局分类，之后再靠 deep self-supervision 把部分 global understanding 恢复回来。

### 复盘判断

因此，这个组会 insight 不能简单表述为“V-JEPA 2.0 比 2.1 强”。更准确的表述是：

> **V-JEPA 2.1 优化的是更强的 dense / spatial representation，但 dense representation 的增强不保证在所有机器人 action downstream 上带来同方向收益。**

这可能反映了三个因素：

- 任务需要的是 task-relevant abstraction，而不是完整视觉细节；
- policy head 可能没有能力有效读取 2.1 的 dense token；
- 2.1 的局部一致性目标和机器人动作目标之间存在 representation-task mismatch。

### 需要统一验证的实验

在同一机器人数据、同一输入帧率、同一 policy head、同一训练预算下比较：

- V-JEPA 2；
- V-JEPA 2.1；
- V-JEPA 2.1 的 global token；
- V-JEPA 2.1 的 dense token pooling；
- DINOv3 image feature；
- RGB raw baseline。

至少记录：

- action prediction loss；
- closed-loop success；
- spatial shift / object distractor 泛化；
- representation 维度、显存、推理延迟；
- frozen encoder、linear probe、轻量 adapter 三种使用方式。

## Insight 2：DINOv3 的下游视觉表征

### 现场观察

组会上认为 DINOv3 对下游任务的图像表征能力很强。这个判断和它的公开定位是相符的：DINOv3 重点强调高质量 dense features、全局 image descriptor，以及在 segmentation、depth、correspondence、object discovery 等任务上的迁移能力。

### 重要区分

“DINOv3 表征强”至少要拆成两个问题：

1. 它是否适合做静态视觉任务的通用 backbone？
2. 它是否天然适合机器人控制中的时间、动作和接触建模？

第一个问题目前有大量支持。第二个问题不能直接由 dense feature benchmark 推出。DINOv3 可能非常擅长告诉模型“这里有一个稳定的物体区域”，但这不等于它已经编码了“这个物体在当前 action 下将如何变化”。

### 对 WAM 的启发

DINOv3 更像一个强视觉结构底座，尤其适合提供：

- object / part-level spatial feature；
- stable correspondence；
- scene geometry 的视觉线索；
- action-region discovery 的输入；
- 2D feature 与 3D point 的跨模态对齐目标。

它仍然需要和 temporal modeling、action conditioning、depth / flow 或 proprioception 结合，才能成为 WAM 的完整 perception-action interface。

## Insight 3：3D Point Flow 与三维表征

### 现场说法

组会上提到 Google 有一些工作表明，flow 形式的点云或类似动态几何信息有助于三维表征。这个线索目前还没有被唯一定位到具体论文，因此这里不把“Google”写成确认出处。

### 当前找到的最接近公开成果

[PointWorld: Scaling 3D World Models for In-The-Wild Robotic Manipulation](https://arxiv.org/abs/2601.03782) 是一个高度吻合的候选，但作者单位是 Stanford University 和 NVIDIA，不是 Google。

PointWorld 的核心做法是：

- 用 RGB-D 构建场景点云；
- 用 robot URDF、运动学和 joint action 构造机器人 point flow；
- 把场景 state 和 robot action 放到同一个 3D point-flow 表示里；
- 用 frozen DINOv3 编码场景点；
- 预测 action-conditioned 的 full-scene 3D point flow；
- 再把预测模型接入 MPC。

这个工作对当前讨论的价值在于，它提供了一个很清楚的反例：

> action 不一定要先被压成 joint vector 或 token；也可以被表示成“机器人几何在三维空间中的运动”，并与场景点云共享表示空间。

这和 DreamX-Phi 的 robot-only flow / $SE(3)$ action interface 在思想上相近，但 PointWorld 更进一步地把 state 和 action 都放进 3D point flow，而 DreamX-Phi 的主输出仍然是 future RGB video。

### 需要继续确认的来源

后续应该根据同学当时展示的 slide、论文标题或作者，把“Google 的工作”定位清楚。当前可以先把候选方向分为：

- 3D point flow world model；
- point tracking / correspondence；
- flow matching for point cloud representation；
- 4D point cloud dynamics；
- robot action represented as spatial flow。

不要把这些概念混成同一个“flow”：

- optical flow：图像平面运动；
- point flow：点或像素对应的三维位移；
- flow matching：生成模型的训练 / 采样范式；
- scene flow：点云或三维场景的时空运动。

## Insight 4：WAM 中的 action-centric preprocessing

### 现场共识

当前 WAM 工作中，一个常见的提升策略是通过人工手段让模型“狠狠地关注 action 相关区域”，例如：

- crop；
- mask；
- 抠图；
- robot rendering；
- skeleton / hand overlay；
- 只训练局部区域；
- 用仿真生成干净的 action-region supervision。

但组会上对这些方案有两个共同疑虑：

1. 抠图和 mask 很难把图像处理干净，边界、遮挡、反光、透明物体和接触区域仍然会留下错误。
2. 仿真中得到的干净区域或渲染条件存在 sim2real gap，真实图像中的 action region 不会像仿真一样规整。

因此大家更倾向于：

> 不希望永久依赖人工预处理，而希望模型自己学会什么是和 action 有关的视觉内容。

### 复盘

这并不意味着所有显式结构都应该被去掉。更合理的方向可能是：

- 用较弱的 geometry / flow / proprioception 作为训练期结构提示；
- 不把硬 mask 当作推理期必需输入；
- 让模型学习 action-conditioned attention 或 object-centric latent；
- 用跨时间一致性和接触后果监督，迫使模型发现真正相关的区域；
- 评估时加入 action-irrelevant background shift，检查模型是否真的学会了因果相关区域。

DreamX-Phi 的组合正好落在这个中间区域：

- PRoPE 负责提供动作几何；
- robot-only flow 负责提供空间运动线索；
- SAM3 mask 只在训练期加权；
- V-JEPA 关系损失约束物体演化；
- 推理时不要求输入 SAM3 mask 或 depth。

它仍然使用了人工或外部模型提供的监督，所以还不能称为“模型完全自主学会 action relevance”。但它比推理期硬 crop 更接近可迁移的训练期 inductive bias。

## 综合判断

把今天的讨论放在一起，当前 WAM 的关键矛盾可以这样描述：

> **模型需要 action-relevant representation，但人们又不希望通过脆弱的手工视觉预处理把 action relevance 写死。**

一端是直接在输入上做 crop、mask、rendering，优点是短期有效，缺点是脆弱且可能引入 sim2real gap。另一端是完全依赖大模型从 RGB 自己学会关注，优点是优雅，缺点是训练信号弱、数据需求高、难以保证模型学到的是动作因果关系而不是相关性。

比较可行的研究路线不是简单选一端，而是分离三个接口：

1. **Perception representation**：DINOv3、V-JEPA 或其他 backbone 提供什么视觉信息。
2. **Action representation**：token、modulation、cross-attention、2D flow、3D point flow、$SE(3)$ attention。
3. **Relevance supervision**：mask、depth、point correspondence、object relation、future latent 或 contact consistency。

最终应当比较的是三者的组合，而不是只比较 backbone 名称。

## Candidate Experiments

### A. Representation-task matching

同一个 action head，替换 V-JEPA 2、V-JEPA 2.1、DINOv3 和 raw RGB。控制：

- 相同数据；
- 相同 observation history；
- 相同动作 chunk；
- 相同参数量和训练步数。

重点看 closed-loop success，而不是只看 frozen feature 的线性 probe。

### B. Action injection ablation

在同一个视频 backbone 上比较：

- action token concatenation；
- FiLM / feature modulation；
- cross-attention；
- rendered robot mask；
- image-space robot flow；
- 3D point flow；
- $SE(3)$ PRoPE；
- PRoPE + flow。

需要把“动作是否被遵循”和“物体是否正确响应”拆成两个指标。

### C. Manual preprocessing dependence

至少设置：

- raw RGB；
- hard crop；
- noisy mask；
- simulated clean mask；
- learned attention；
- training-only mask supervision；
- training-only mask + relation supervision。

测试时加入背景、光照、相机位姿、遮挡和机器人外观变化，观察方法是否依赖预处理分布。

### D. 2D versus 3D motion cue

比较：

- optical flow；
- depth + optical flow；
- RGB-D point cloud；
- robot point flow；
- full-scene point flow。

目标不是先证明 3D 一定最好，而是确定三维 flow 的收益来自：

- 更好的几何表达；
- 更好的 action localization；
- 更好的 cross-embodiment transfer；
- 还是仅仅来自额外的 depth / tracking supervision。

## Open Questions

- V-JEPA 2.0 在机器人任务上更好的现象，是否只出现在特定 action head 或数据规模下？
- V-JEPA 2.1 的 dense feature 是否需要专门的 spatial pooling 或 action-conditioned adapter 才能被 policy 使用？
- DINOv3 的静态 correspondence 能否通过短时序训练转化为 action-relevant representation？
- 3D point flow 的收益是否依赖 RGB-D 质量和相机标定？
- hard mask 与 soft relevance map 的差异，究竟是监督质量问题还是 inductive bias 问题？
- 训练期显式监督和推理期自主关注之间，是否存在可量化的“外部提示依赖度”？
- WAM 的 benchmark 是否应该增加 action-irrelevant background shift 和 contact-state consistency 指标？

## Related Reading

- [DreamX-Phi 1.0](/papers/dreamx-phi-2608-13489/)
- [AC-WM 主题综述](/surveys/ac-wm/)
- [PointWorld: Scaling 3D World Models for In-The-Wild Robotic Manipulation](https://arxiv.org/abs/2601.03782)
- [V-JEPA 2](https://arxiv.org/abs/2506.09985)
- [V-JEPA 2.1](https://arxiv.org/abs/2603.14482)
- [DINOv3](https://arxiv.org/abs/2508.10104)
- [WAM 主题综述](/surveys/wam/)
