---
title: "破壳机器人 UAG 架构"
date: "2026-08-05"
description: "36氪访谈中披露的 WAM 训练路线：用 Unconditioned Action Guidance 做并联式预训练，把动作预测器与视觉世界模型联合训练。"
source_url: "https://view.inews.qq.com/a/20260427A01YPV00"
source_name: "36氪 / 腾讯新闻"
cover: "xu-huazhe.jpg"
cover_caption: "36氪访谈配图：许华哲，破壳机器人创始人。"
cover_source: "https://view.inews.qq.com/a/20260427A01YPV00"
cover_credit: "36氪 / 企业官方"
resource_type: "company-news"
status: "triaged"
published_date: "2026-04-27"
topics: ["robotics", "embodied-ai", "world-action-model", "robot-learning"]
tags: ["poke-robot", "uag", "unconditioned-action-guidance", "world-action-model", "home-robot", "reinforcement-learning"]
categories: ["resources"]
use_case: "跟踪产业侧如何把 world model、动作预训练、离线强化学习和家庭机器人数据采集连成一条训练管线。"
why_save: "它不是单篇论文，但提供了一个值得继续观察的 WAM 工程路线：把动作先做成可训练的预测器，再与视觉世界模型联合。"
---

## What It Is

UAG 是破壳机器人在 36氪访谈中披露的模型训练架构，全称为 **Unconditioned Action Guidance**。按许华哲在访谈中的描述，它不是传统 VLA 路线，而是面向“视频 + 动作”输入输出的世界模型路线；模型既要理解真实世界视频中的物理规律，也要直接生成可执行动作。

更具体地说，UAG 试图用并联式预训练替代瀑布式级联：先对动作进行预训练，再把所有动作联合训练成动作预测器，最后把动作预测器和视觉模型放到一起联合训练。访谈中给出的解释是，动作序列相对视频更轻量，先把动作空间学稳，有机会保留基础模型泛化能力，同时提升训练效率。

{{< figure src="xu-huazhe.jpg" alt="许华哲在 36氪访谈配图中发言" caption="访谈原文把 UAG 放在破壳机器人 To C 家庭机器人、世界模型和数据采集系统的同一技术叙事里。图片来源：36氪 / 腾讯新闻。" >}}

## Why It Matters

这条资讯值得进入 WAM 主题线，是因为它提供了一个产业侧视角：WAM 不只是在论文里讨论“是否显式想象未来”，还会落到更具体的训练系统设计上。

如果把 Fast-WAM 和 Faster-WAM 看成“推理阶段如何降低成本”，UAG 更接近“预训练阶段如何组织动作、视觉和强化学习”。它关心的问题是：动作是不是应该先被单独预训练成稳定接口？视觉世界模型和动作预测器应该按顺序级联，还是并行预训练后联合对齐？离线强化学习能不能进入预训练阶段，而不是只作为后训练补丁？

## Possible Uses

- 作为 WAM 产业路线观察点，持续跟踪破壳机器人是否公开技术报告、论文、Demo 或模型接口。
- 对比 VLA、VLWAM、显式世界仿真、latent WAM 等不同路线在家庭机器人上的取舍。
- 关注“动作先验/动作预测器”是否能降低大视频模型接动作头时的训练难度。
- 记录数据闭环关键词：外骨骼数据、UMI/硬手套数据、第一人称视角人类视频、机器人自测和失败样本。

## Notes

- 当前主要来源是 36氪访谈转载，暂未见公开论文、代码或可复现实验，因此这里按“公司技术路线线索”保存。
- 访谈称破壳机器人第一代 32B 参数规模的具身世界模型已完成首轮训练；这属于受访者披露信息，需要等待后续公开材料验证。
- “训练效率至少 5 倍以上”也是访谈口径，不宜直接拿来和论文 benchmark 对比。
- 这条线和 Being-H0.8 的触觉隐式 WAM、Fast-WAM/Faster-WAM 的低延迟 WAM 可以合并观察：一个看接触模态，一个看训练管线，一个看推理效率。

## Related Entries

- [WAM survey](/surveys/wam/)
- [Being-H0.8](/resources/being-h08/)
- [Fast-WAM](/paper-briefs/fast-wam-2603-16666/)
- [Faster-WAM](/paper-briefs/faster-wam-2608-02365/)

来源:

- [36氪 / 腾讯新闻: 「破壳机器人」许华哲：两年内，中国将出现可用的家庭机器人](https://view.inews.qq.com/a/20260427A01YPV00)
