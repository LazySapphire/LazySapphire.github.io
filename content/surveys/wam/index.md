---
title: "WAM 主题综述"
description: "把 Being-H0.5、Fast-WAM、破壳机器人 UAG、Being-H0.7、Being-H0.8 和 Faster-WAM/DoT 组织成一条可检索的 world-action-model 家族线。"
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
timeline_items:
  - title: "Faster-WAM / DoT"
    date: "2026-08-05"
    url: "/paper-briefs/faster-wam-2608-02365/"
    side: "left"
    badge: "低延迟动作头"
    summary: "华为诺亚等提出 Dock of Transformer, 把视频 DiT 作为 representation hub, 再用单层 action head 读取多层 KV 表示。"
    branches:
      - "核心问题: WAM 的 action module 是否必须和 video backbone 一样深。"
      - "关键接口: KV-Fusion 与 video-action RoPE alignment。"
      - "适合观察: 低延迟 WAM、浅动作头、消费级部署。"
  - title: "Being-H0.8"
    date: "2026-07-28"
    url: "/resources/being-h08/"
    side: "right"
    badge: "触觉隐式 WAM"
    summary: "BeingBeyond 把 tactile/contact supervision 接入 latent WAM, 让触觉成为共享 latent world state 的一部分。"
    branches:
      - "核心问题: 接触、滑移、压力等反馈如何进入动作相关 latent。"
      - "关键模块: TactoHand、Universal Tactile Encoder、Slow-Fast Action Expert。"
      - "适合观察: 灵巧操作、触觉基础模型、接触丰富控制。"
  - title: "Being-H0.7"
    date: "2026-05-01"
    url: "/paper-briefs/being-h07-2605-00078/"
    side: "left"
    badge: "latent WAM"
    summary: "典型基础模型级混合架构: 在 perception 与 action 之间插入 latent queries, 用 prior/posterior 双分支吸收未来信息。"
    branches:
      - "核心问题: future-aware reasoning 是否可以不靠测试时像素 rollout。"
      - "结构线索: VLA 底座 + latent WAM 接口 + flow matching action policy。"
      - "家族位置: 从 Being-H0.5 走向 H0.8 触觉扩展的中间桥梁。"
  - title: "破壳机器人 UAG"
    date: "2026-04-27"
    url: "/resources/poke-robot-uag-wam/"
    side: "right"
    badge: "并联式预训练"
    summary: "产业侧披露的 Unconditioned Action Guidance 路线, 先稳住动作预测器, 再与视觉世界模型联合训练。"
    branches:
      - "核心问题: 动作预训练和视觉世界模型应该串联还是并联。"
      - "训练视角: 动作预测器、离线强化学习、家庭机器人数据闭环。"
      - "适合观察: 公司技术路线、后续论文或可复现实验。"
  - title: "Fast-WAM"
    date: "2026-03-20"
    url: "/paper-briefs/fast-wam-2603-16666/"
    side: "left"
    badge: "省掉推理期想象"
    summary: "保留训练期视频协同训练, 推理时跳过 future video generation, 只用当前观察形成 latent world representation 并生成动作。"
    branches:
      - "核心问题: test-time future imagination 是否真有必要。"
      - "关键设计: action flow matching + future video latent co-training。"
      - "适合观察: WAM 低成本复现、LIBERO/RoboTwin 对照实验。"
  - title: "Being-H0.5"
    date: "2026-01-20"
    url: "https://research.beingbeyond.com/being-h05"
    side: "right"
    badge: "家族底座"
    summary: "Being-H 系列的早期底座, 重点是统一动作语言、跨实体泛化和机器人动作数据的基础组织方式。"
    branches:
      - "核心问题: 不同机器人实体和人类视频如何进入同一动作接口。"
      - "家族作用: 为 H0.7 的 latent WAM 和 H0.8 的触觉路线提供前置底座。"
      - "适合观察: 统一动作语言、跨机器人迁移、基础 VLA 能力。"
---

## 主题解释

WAM, World Action Model, 可以先理解为把“世界将如何变化”和“机器人接下来该怎么动”放在同一个建模问题里。它和普通 VLA 的差异不在于一定要生成未来视频, 而在于模型内部是否形成了动作相关的世界状态: 这个状态可能是像素 rollout, 也可能是 latent queries、video backbone hidden states、动作先验或者触觉接触表征。

当前这条线最值得跟踪的是三组分歧:

- **未来信息放在哪里**: H0.7 把未来监督压进 latent, Fast-WAM 则证明推理阶段可以不显式想象未来。
- **动作模块该有多重**: Faster-WAM/DoT 把视频 DiT 当作表示枢纽, 用很浅的动作头 dock 到多层视频表示上。
- **新模态和训练管线如何接入**: H0.8 关注触觉/接触, UAG 关注动作预训练与视觉世界模型的并联式组织。

这页先作为轻量综述入口使用: 下面的树形时间线负责展示项目之间的先后关系和技术分支, 具体细节仍进入各条报告阅读。

## 阅读优先级

如果只是快速建立地图, 先看 **Fast-WAM** 和 **Faster-WAM/DoT**: 它们直接回答推理效率问题。随后看 **Being-H0.7** 理解 latent WAM 的核心接口, 再把 **Being-H0.8** 放到触觉扩展里观察。**UAG** 目前更像产业侧训练系统线索, 适合持续归档, 暂不当作可复现论文处理。
