---
title: "WAM 主题综述"
description: "把 Being-H0.5、Being-H0.7、Fast-WAM、Being-H0.8、UAG 和 Faster-WAM 组织成一条可检索的 world-action-model 家族线。"
date: "2026-08-05"
cover: "family-comparison.webp"
cover_caption: "H0.7 官方结果图, 作为这条 WAM 线的家族摘要: H0.7、H0.5、Pi0.5 和 Fast-WAM 被放到同一比较面上。"
cover_source: "https://research.beingbeyond.com/being-h07"
cover_credit: "BeingBeyond Research"
status: "triaged"
survey_type: "lightweight"
topics: ["robotics", "embodied-ai", "world-action-model", "robot-learning"]
tags: ["wam", "being-h", "fast-wam", "faster-wam", "dot", "uag", "latent-wam", "tactile", "low-latency-wam"]
categories: ["surveys"]
source_count: 6
time_window: "2026-01-20 to 2026-08-05"
---

## Snapshot

这条线可以先这样记: H0.5 提供统一动作语言和跨实体训练底座, H0.7 把未来意识压进 latent queries, Fast-WAM 砍掉 test-time future imagination 的负担, H0.8 再把触觉和接触反馈接进隐式 WAM, 破壳机器人 UAG 把动作预训练和视觉世界模型做并联式组织, Faster-WAM/DoT 则把 WAM 推理延迟压到 VLA 级别。

{{< figure src="being-h07-arch.webp" alt="Being-H0.7 architecture" caption="H0.7 的双分支 latent 结构, 适合把它放在 WAM 家族中间位置理解。" >}}

## Why This Topic Matters

WAM 这条路的关键问题不是“能不能生成未来”, 而是“未来信息应该在什么时候、以什么形式进入控制器”。
有的工作把未来放在像素 rollout 里, 有的把未来压到 latent reasoning 里, 有的干脆只保留训练期协同信号。这个分歧决定了延迟、训练成本和部署形态。

## Main Themes

- latent interface: 用 query、hidden state 或 codebook 把 perception 和 action 中间的推理层抽出来。
- future-aware supervision: 训练时让未来观察或未来视频参与监督, 但不一定在推理时保留。
- deployment efficiency: 把 test-time video generation、chunk scheduling 和 whole-body backend 分离, 争取在线可用。
- tactile extension: 把触觉和接触结果纳入 latent WAM, 而不是只在末端控制里补反馈。
- action-module efficiency: 把 action head 从深 DiT 压缩为浅层 docked head, 但仍让它读取视频 backbone 的多层表示。
- pretraining pipeline: 产业侧开始关注动作预训练、离线强化学习、视觉世界模型和家庭数据采集如何合成一条训练流水线。

## Representative Items

| Item | Role |
| --- | --- |
| [Being-H0.5](https://research.beingbeyond.com/being-h05) | 家族底座: 统一动作语言、跨实体泛化、数据和部署都先站稳。 |
| [Being-H0.7](/paper-briefs/being-h07-2605-00078/) | 中间桥梁: latent world-action model, 把未来意识压进 latent queries。 |
| [Fast-WAM](/paper-briefs/fast-wam-2603-16666/) | 效率反例: 证明 test-time future imagination 不是必须项。 |
| [Being-H0.8](/resources/being-h08/) | 触觉扩展: 把 contact / tactile supervision 接进同一条线。 |
| [破壳机器人 UAG](/resources/poke-robot-uag-wam/) | 产业线索: 访谈中披露的并联式预训练架构, 先学动作预测器再和视觉世界模型联合。 |
| [Faster-WAM / DoT](/paper-briefs/faster-wam-2608-02365/) | 低延迟路线: 把视频 DiT 作为 representation hub, 用单层 action head 通过 docking interface 读多层 KV。 |

## Open Questions

- latent future reasoning 和 explicit rollout 的分界线在哪里?
- 训练期未来监督能保留多少收益, 而不增加太多推理成本?
- 触觉进入 latent WAM 之后, 视觉 backbone 还要多重?
- 单层或浅层 action head 够用的前提是什么: 强视频 hub、跨层 KV 融合, 还是足够好的动作预训练?
- 产业侧的 UAG 类训练管线能否公开为可复现实验, 以及它和论文里的 DoT/Fast-WAM 是否能合并?
- 这条家族线最终会收敛成单一架构, 还是保持多分支分工?

## Related Entries

- [Being-H0.7](/paper-briefs/being-h07-2605-00078/)
- [Being-H0.8](/resources/being-h08/)
- [Fast-WAM](/paper-briefs/fast-wam-2603-16666/)
- [Faster-WAM](/paper-briefs/faster-wam-2608-02365/)
- [破壳机器人 UAG](/resources/poke-robot-uag-wam/)
- [Being-H0.5](https://research.beingbeyond.com/being-h05)
