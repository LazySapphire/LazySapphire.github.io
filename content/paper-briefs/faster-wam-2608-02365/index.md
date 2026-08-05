---
title: "Faster-WAM: Do World Action Models Need Deep Action Modules?"
list_title: "Faster-WAM"
date: "2026-08-05"
description: "华为诺亚等提出 DoT，把视频 Transformer 当作表示枢纽，只接一个轻量 action head，从而把 WAM 推理延迟压到 VLA 级别。"
cover: "dot-architecture.png"
cover_caption: "论文 Figure 2：DoT 用 KV-Fusion 和 video-action RoPE alignment 把单层 action head dock 到视频 DiT hub 上。"
cover_source: "https://arxiv.org/abs/2608.02365"
cover_credit: "Ma et al., 2026"
paper_title: "Faster-WAM: Do World Action Models Need Deep Action Modules?"
authors: ["Liheng Ma", "Rui Heng Yang", "Zhanguang Zhang", "Mateo Clemente", "Ziwen Hu", "Tongtong Cao", "Yingxue Zhang"]
year: 2026
venue: "arXiv"
arxiv: "2608.02365"
doi: "10.48550/arXiv.2608.02365"
paper_url: "https://arxiv.org/abs/2608.02365"
status: "triaged"
reading_level: "brief"
topics: ["robotics", "embodied-ai", "world-action-model", "robot-learning"]
tags: ["faster-wam", "dot", "dock-of-transformer", "low-latency-wam", "kv-fusion", "rope-alignment"]
categories: ["paper-briefs"]
---

## One-Line Takeaway

Faster-WAM 的核心观点是：如果预训练视频 Transformer 已经有足够强的物理动态表征，WAM 的动作模块未必需要和视频骨干一样深；可以把视频 DiT 当作 representation hub，只 dock 一个轻量动作头。

## Problem

Fast-WAM 已经说明，WAM 不一定要在测试时显式生成未来视频。但许多 MoT 式 WAM 仍然保留较深的 action expert，因为 action stream 和 video stream 常按层一一对应。这会把 action module 的深度和 video backbone 绑死，导致推理阶段仍然有明显延迟。

这篇论文的问题更直接：**World Action Model 是否真的需要很深的动作模块？**

{{< figure src="wam-architecture-comparison.png" alt="MoT、H-Bridge 和 DoT 架构对比" caption="论文 Figure 1：MoT 依赖 video-action 层级对应，H-Bridge 只在固定中间层交互；DoT 则把视频 backbone 作为 hub，让任务头通过 docking interface 读取多层表示。" >}}

## Method

论文提出 **Dock of Transformer (DoT)**。它不是把视频模块和动作模块当成两个对等的深网络，而是把预训练视频 Transformer 设为中心表示枢纽，再让轻量任务头通过显式 docking interface 接入。

Faster-WAM 是 DoT 在 WAM 上的实例化：使用 Wan2.2-TI2V-5B 的 30 层 video DiT 作为 hub，只接一个单层 Transformer action head。docking interface 有两个关键组件：

- **KV-Fusion**：把所有 video DiT 层的 key/value 缓存做通道映射和跨层聚合，让单层动作头也能访问多层视频表示。
- **video-action RoPE alignment**：先撤销视频侧 3D RoPE，再对融合后的 video keys 应用动作侧 1D RoPE，避免 action queries 和 video keys 的位置编码基底错位。

{{< figure src="dot-architecture.png" alt="DoT docking interface architecture" caption="论文 Figure 2：KV-Fusion 负责跨层融合 video KV，RoPE alignment 负责把视频表示对齐到动作头使用的 1D 时序位置坐标。" >}}

论文还移除了 action head 中的 text cross-attention，把语言信息交给 language-conditioned video hub 处理，再通过 docking interface 暴露给 action head。这样 action head 更集中地做动作生成。

## Why Save It

- 它把 WAM 的低延迟路线又往前推了一步：不只去掉测试时未来视频生成，还进一步质疑深 action expert 是否必要。
- 论文报告 Faster-WAM 在 LIBERO 达到 98.50%，RoboTwin 2.0 达到 89.17%，LIBERO-Plus 达到 75.0%。
- 论文报告 32-step action chunk 推理延迟为 66.5 ms；同一受控比较中 Fast-WAM 为 211.7 ms，因此 Faster-WAM 快 3.2x。
- 对 24GB 级消费 GPU 部署很有参考价值：它保留完整视频 hub，但把动作侧计算压得非常薄。
- 它给后续 WAM 工程提供了一个清晰设计问题：动作头应该复制视频骨干的深度，还是通过接口复用视频骨干的多层表示？

## Results And Ablations

{{< figure src="design-ablation.png" alt="Faster-WAM design ablation on LIBERO-Plus" caption="论文 Figure 3(a)：从 final-only 单层头到 KV-Fusion、RoPE alignment、移除 text cross-attention，LIBERO-Plus 成功率逐步提升到 75.0%。" >}}

{{< figure src="kv-fusion-signals.png" alt="Faster-WAM learned layer mixing signals" caption="论文 Figure 3(b)：KV-Fusion 的 learned layer-mixing signal 分布在多个 video layers 上，中间层信号更强，但并非只依赖单一固定层。" >}}

这组消融的意义在于：单层 action head 不是简单读取最后一层 hidden state，而是通过 docking interface 主动组合视频 backbone 的多层 key/value。也就是说，Faster-WAM 的“浅动作头”依赖一个明确的信息通道设计，而不是盲目压缩模块深度。

## Limitations Or Questions

- 论文当前是 arXiv v1，后续如果有项目页、代码或正式会议版本，需要复查实验设置、延迟测量和表述。
- Faster-WAM 的真实机器人评估还在 future work 中，当前主要证据来自 LIBERO、RoboTwin 2.0 和 LIBERO-Plus。
- 它使用 Wan2.2-TI2V-5B 作为视频 hub；如果换成更小或不同结构的视频模型，DoT 的收益需要重新测。
- LIBERO-Plus 上虽然相对 Fast-WAM 提升明显，但论文也指出大规模 embodied pretraining 对强分布偏移仍可能有互补价值。

## Related Entries

- [Fast-WAM](/paper-briefs/fast-wam-2603-16666/)
- [Being-H0.7](/paper-briefs/being-h07-2605-00078/)
- [Being-H0.8](/resources/being-h08/)
- [破壳机器人 UAG 架构](/resources/poke-robot-uag-wam/)
- [WAM survey](/surveys/wam/)

## Links

- [arXiv:2608.02365](https://arxiv.org/abs/2608.02365)
- [PDF](https://arxiv.org/pdf/2608.02365)
