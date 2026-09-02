---
title: "机器人灵巧手与 WAM 调研报告"
list_title: "灵巧手与 WAM 调研报告"
date: "2026-08-21"
description: "一份围绕机器人灵巧手、World Action Model、动作条件世界模型、预测视觉表征和触觉原生 WAM 的本地调研报告归档，并补充面向本站研究路线的扩展讨论。"
cover: "cover.webp"
cover_caption: "报告首页渲染图：资料时间窗覆盖 2024-08-21 至 2026-08-21。"
resource_type: "research-report"
status: "maintained"
published_date: "2026-08-21"
source_name: "本地 PDF / Luna 调研报告"
topics: ["robotics", "dexterous-hand", "world-action-model", "ac-wm", "tactile"]
tags: ["dexterous-hand", "wam", "ac-wm", "tactile-wam", "world-model", "contact-rich-manipulation", "replication", "survey-report"]
categories: ["resources"]
use_case: "作为灵巧手 + world model 方向的入口资料，快速定位过去两年的主线工作、硬件覆盖、数据形态、指标差异和复现优先级。"
why_save: "它把灵巧手证据和通用 WAM 证据分层比较，避免把并联夹爪或双臂平台上的高分结果直接解释成多指灵巧手能力。"
---

## What It Is

这是本地 PDF 调研报告《机器人灵巧手 + 世界动作模型（WAM）前沿研究调研》的仓库归档版。报告共 14 页，资料截点为 **2026-08-21**，覆盖过去两年中与灵巧手、WAM、AC-WM、预测视觉表征和触觉原生 WAM 相关的公开研究。

- [下载 PDF 原文](luna-dexterous-hand-wam-survey.pdf)
- SHA256: `2a1fc39adee09f64dedaa8bff14441c38d465ac232dcc735a02eb39d03af1793`

报告的价值不在于列论文名，而在于它做了一个必要的分层：**灵巧手证据**和**通用 WAM 证据**不能直接混在一起。很多 WAM 工作在 LIBERO、RoboTwin、Franka、ALOHA 或双臂平台上很强，但那不等于它已经解决了 Allegro、Leap、XHand、Shadow、Wuji 这类多指手的手指级接触、形态迁移和触觉闭环。

## Report Map

报告把相关工作分成四类：

- **严格 WAM**：未来状态和动作在同一世界-动作目标中耦合，代表包括 UVA、UWM、DreamZero、LingBot-VA、Cosmos Policy、Dream-Tac、N0-TWAM。
- **动作条件世界模型**：先学 `f(s,a)->s'`，再用 MPC 或采样规划，代表包括 Cross-Embodiment WM、DexWM、DWM。
- **预测视觉表征策略**：视频模型主要作为视觉编码器或预测表征，VPP 是灵巧手方向的重要前身。
- **世界模型数据/模拟器**：用生成世界模型产生人手数据或可交互视频，Wh0 和 DWM 更接近这条线。

这套分类和本站现有两条线可以这样对齐：

- [WAM 主题综述](/surveys/wam/) 关注 world-action interface、latent future、action-only inference 和动作头设计。
- [AC-WM 主题综述](/surveys/ac-wm/) 关注给定 action 后 future observation / state 如何变化。
- 这份报告进一步把 **dexterous hand** 和 **tactile future** 放进上面两条线之间，提醒我们不要只看视频生成或 benchmark success。

## Key Takeaways

报告最值得保存的判断有四个。

第一，WAM 的发展重心正在从像素级未来想象，转向动作相关表征、语义 visual-action token、3D flow / particle 和触觉未来。对灵巧手来说，这个转向是必要的：单纯 RGB future 很难可靠表达接触是否建立、手指是否滑移、物体是否受力。

第二，多指灵巧手仍然缺少像 LIBERO 这样统一、低成本、可复现的评测入口。VPP、Cross-Embodiment WM、DexWM、TouchWorld 和 Wh0 比较接近目标，但各自被硬件、数据或大模型训练成本卡住。

第三，触觉不是可选增强，而是很多 contact-rich task 的状态观测缺口。Dream-Tac、TouchWorld 和 N0-TWAM 的共同意义，是把 future tactile 或 contact event 从后验反馈变成 world model 的预测对象。

第四，复现顺序应该保守：先复现 UWM / Cosmos 这类公开资产完整的 WAM baseline，再做小规模 3D hand-object state 或 tactile branch，而不是一开始就追 5B/14B 视频生成器。

## Expanded Discussion

### 1. WAM 与 AC-WM 的分界在灵巧手上会变得模糊

在普通机械臂或并联夹爪任务里，可以比较清楚地说：WAM 更偏 world-action latent，AC-WM 更偏给定动作后的 future observation。但多指灵巧手会让这个边界变模糊，因为“未来观测”本身必须包含可控制的手-物状态。

例如，视频中的手指位置、物体点云、触觉压力和接触事件，不只是世界状态；它们也会决定下一段动作是否可执行。对灵巧手而言，合理的建模对象可能不是 `future RGB` 或 `future action` 二选一，而是一个共同的 **hand-object-contact state**：

- 手的结构：joint / fingertip / keypoint / mesh。
- 物体状态：pose、point cloud、particle 或 deformation field。
- 接触状态：contact onset、slip、normal force、pressure map。
- 动作接口：joint target、end-effector delta、per-finger command 或 action chunk。

因此，后续站内分类可以继续保留 WAM / AC-WM，但读具体灵巧手论文时要额外标记它是否真的建模了 hand-object-contact state。

### 2. 最小闭环不应该从视频生成器开始

报告给出的最小路线很务实：先用 UWM/LIBERO 或 DROID 复现 WAM 的联合训练和 action-only inference，再逐步加入手关键点、3D flow、物体点云、proprio 和 tactile。

{{< figure src="research-route.webp" alt="调研报告中的最小可复现路线和 PyTorch 模型骨架" caption="报告第 12 页：推荐路线不是先训练 5B 视频生成器，而是从可复现 WAM baseline、灵巧手表示、人类到机器人迁移、接触原生和真实闭环逐级推进。" >}}

我倾向于把这条路线改写成本站后续实验路线：

1. **S0: 通用 WAM sanity check**

   复现 UWM 或 Fast-WAM 类 action-only 推理，记录 success、future prediction trend、latency、VRAM 和失败案例。

2. **S1: hand-aware state target**

   不急着上大视频模型，先在 SAPIEN / RoboCasa / Isaac 类环境里预测 hand keypoints、object point cloud、contact event，让 future target 对灵巧手有意义。

3. **S2: cross-hand ablation**

   同一 world model 是否能从 Allegro 泛化到 Leap / XHand / Ability。这里要看 PCK、CD/EMD、unseen-hand MSE 和 task success 是否同步改善。

4. **S3: tactile branch**

   加入低维 force / pressure map 或二值 contact event。先做触觉消融：只有当前触觉、只有未来触觉、两者都有、两者都没有。

5. **S4: real-loop gate**

   真实硬件上先做短 horizon、安全约束和失败恢复，不先追求复杂任务。每个任务至少记录 20-50 trials、延迟、OOD 和 failure taxonomy。

这条路线的好处是每一步都有可证伪指标，不会把“视频看起来动得合理”误当成“手指级控制已经可用”。

### 3. 指标必须从 success rate 扩展到接触和系统层

报告反复强调指标不可比，这一点对灵巧手尤其关键。只报 success rate 很容易掩盖问题：策略可能靠偶然摩擦完成任务，也可能在固定物体和相机下过拟合。

后续记录灵巧手 + WAM 工作时，建议至少保留四组指标：

- **任务层**：success、task progress、阶段成功率、20-50 trials 置信区间。
- **手-物层**：PCK@20、fingertip error、object pose、point cloud CD/EMD。
- **接触层**：contact onset F1、slip rate、force / pressure error、insertion alignment。
- **系统层**：action latency、requery Hz、planning time、GPU memory、failure recovery。

这样才能区分三件事：模型是否理解未来、策略是否完成任务、系统是否能在真实机器人上安全实时运行。

### 4. 下一批应补读的论文

这份报告也给后续阅读排序提供了线索。按“对本站当前 WAM / AC-WM / 灵巧手研究线的边际价值”排序，我会优先补：

- **UWM**：最适合作为公开可复现 WAM baseline。
- **DexWM**：人类手视频到机器人多指手的桥梁，适合和 Piano / hand motion 数据路线对照。
- **Cross-Embodiment WM**：3D particle / displacement field 对跨手形态的启发最大。
- **Dream-Tac / N0-TWAM / TouchWorld**：触觉 future 与 contact event 的三种不同组织方式。
- **EgoWAM / RepWAM / LingBot-VA 2.0**：从 pixel future 走向 DINO / semantic visual-action token 的表示路线。

其中 UWM 和 DexWM 适合先整理成论文阅读笔记；Dream-Tac 和 N0-TWAM 适合进入 WAM 综述的触觉分支；Cross-Embodiment WM 则可以作为 AC-WM 与 dexterous hand 的交叉入口。

## How To Use This Report

短期使用方式：

- 想快速建立方向地图：先读执行摘要、发展脉络、统一比较和第 6 节研究建议。
- 想选复现目标：看第 5 节的公开资产审计和复现优先级。
- 想做灵巧手研究规划：从第 6.1 的 S0-S4 路线和第 6.3 的指标表开始。

中期维护方式：

- 把报告里的重点论文逐步拆成站内论文笔记。
- 把 WAM / AC-WM / tactile WAM 的主题页继续细分。
- 每次新增论文时标注硬件形态：多指手、并联夹爪、双臂、移动双臂、人手视频、仿真手。
- 对所有“灵巧手能力”声明加上证据等级，不用通用机械臂成功率替代多指手证据。

## Related Entries

- [WAM 主题综述](/surveys/wam/)
- [AC-WM 主题综述](/surveys/ac-wm/)
- [DreamX-Phi 1.0](/papers/dreamx-phi-2608-13489/)
- [Being-H0.8](/resources/being-h08/)
- [Fast-WAM](/paper-briefs/fast-wam-2603-16666/)
- [Faster-WAM / DoT](/paper-briefs/faster-wam-2608-02365/)
