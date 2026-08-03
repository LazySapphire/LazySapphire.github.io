---
title: "Being-H0.8"
date: "2026-08-03"
description: "BeingBeyond 发布的 Latent Tactile World-Action Model，把触觉模态引入大规模人类视频预训练和接触丰富的机器人操作。"
source_url: "https://research.beingbeyond.com/being-h08"
source_name: "BeingBeyond Research"
cover: "teaser.webp"
cover_caption: "Being-H0.8 官方项目页展示图，突出触觉、手部交互和接触丰富操作场景。"
cover_source: "https://research.beingbeyond.com/being-h08"
cover_credit: "BeingBeyond Research"
resource_type: "product"
status: "triaged"
published_date: "2026-07-28"
topics: ["robotics", "embodied-ai", "tactile", "world-action-model"]
tags: ["being-h", "beingbeyond", "latent-wam", "tactile", "dexterous-manipulation"]
categories: ["resources"]
use_case: "跟踪触觉如何进入隐式世界动作模型，以及人类第一视角视频如何转化为机器人可用的接触监督。"
why_save: "它把 Being-H0.7 的 latent WAM 路线扩展到触觉、接触反馈和灵巧操作，是后续理解触觉基础模型与接触丰富操作的重要入口。"
---

## What It Is

Being-H0.8 是 BeingBeyond 在 2026-07-28 发布的具身基础模型项目，官方定位为 **Latent Tactile World-Action Model at Scale**。它延续 Being-H0.7 的 latent World-Action Model 路线，但把建模重点从视觉预测扩展到触觉感知和接触丰富的交互。

官方项目页称，Being-H0.8 将触觉视为共享 latent world state 中与动作相关的一部分。训练时使用未来视觉和触觉证据监督当前可部署的 latent 表示；部署时移除未来信息和 posterior 分支，只保留可用的 prior 表示进行动作生成。

数据层面，它依赖 UniHand 3.0，官方称其汇集了 500,000+ 小时第一视角人类视频。由于普通视频没有真实触觉信号，Being-H0.8 引入 TactoHand，从手-物交互视频中生成接触位置和接近程度等伪触觉监督；同时用通用触觉编码器统一接触、邻近度、压力等异构触觉信号。

## Why It Matters

这个项目值得保存，主要因为它明确把“触觉”放进了隐式 WAM 的核心链路，而不是只把触觉作为动作执行后的附加反馈。

对灵巧操作来说，仅靠视觉很难可靠判断接触是否建立、受力区域在哪里、是否滑移、是否需要改变下一小段动作。Being-H0.8 的思路是：在 latent 空间中预测与任务相关的接触后果，再用最新状态和触觉反馈修正近端动作。

{{< figure src="model-pipeline.webp" alt="Being-H0.8 模型流程图" caption="官方模型流程图：训练阶段引入未来视觉/触觉证据，部署阶段使用可观测状态形成动作相关 latent 表示。图片来源：BeingBeyond Research。" >}}

这也把 Being-H 系列的关注点从“大规模人类视频能否用于机器人预训练”，推进到“如何从没有显式触觉标注的人类视频中抽取可训练的物理交互监督”。

## Possible Uses

- 作为触觉具身基础模型、隐式世界动作模型、接触丰富机器人操作的跟踪入口。
- 对比 VLA、latent WAM、visuo-tactile pretraining、action expert 等路线的差异。
- 记录 TactoHand、TopoHand、Universal Tactile Encoder、Slow-Fast Action Expert 这些模块名，后续论文发布后可进一步拆解。
- 关注人类第一视角视频、伪触觉标注、真实触觉传感器数据如何在同一训练体系中对齐。

## Notes

- 官方页面目前显示 paper coming soon，因此这里暂不整理为论文速读；等 arXiv 或正式技术报告发布后，再补一篇 `paper-briefs`。
- Being-H GitHub 仓库当前公开展示的模型家族重点仍是 Being-H0.7 和 Being-H0.5，H0.8 的项目页已经存在，但代码、checkpoint 或论文入口需要后续复查。
- “全球首个”“首个基于人类视频数据”等表述来自官方新闻或媒体报道，现阶段按发布方/报道说法保存，不视为独立验证结论。
- 量子位报道对“隐式触觉 WAM”的解释较清晰：重点不是像素级重建未来画面，而是在 latent space 中预测接触与交互后果，并用预测出的潜在状态调节动作。

来源:

- [Being-H0.8 official project page](https://research.beingbeyond.com/being-h08)
- [Being-H GitHub repository](https://github.com/BeingBeyond/Being-H)
- [BeingBeyond 新闻动态](https://beingbeyond.com/news.html)
- [量子位报道: 世界模型有触觉了](https://www.sohu.com/a/1056858114_610300)
