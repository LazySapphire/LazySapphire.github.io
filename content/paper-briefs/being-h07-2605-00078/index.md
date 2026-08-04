---
title: "Being-H0.7: A Latent World-Action Model from Egocentric Videos"
list_title: "Being-H0.7"
date: "2026-08-04"
description: "BeingBeyond 的 latent WAM 代表作：用 latent queries 和 prior/posterior 双分支把未来信息压进动作接口，而不是在测试时生成未来帧。"
cover: "intuition.webp"
cover_caption: "官方直觉图：latent queries 位于 perception 与 action 之间，承担紧凑的世界动作推理接口。"
cover_source: "https://research.beingbeyond.com/being-h07"
cover_credit: "BeingBeyond Research"
paper_title: "Being-H0.7: A Latent World-Action Model from Egocentric Videos"
authors: ["Hao Luo", "Wanpeng Zhang", "Yicheng Feng", "Sipeng Zheng", "Haiweng Xu", "Chaoyi Xu", "Ziheng Xi", "Yuhui Fu", "Zongqing Lu"]
year: 2026
venue: "arXiv"
arxiv: "2605.00078"
paper_url: "https://arxiv.org/abs/2605.00078"
project_url: "https://research.beingbeyond.com/being-h07"
code_url: "https://github.com/BeingBeyond/Being-H"
status: "triaged"
reading_level: "brief"
topics: ["robotics", "embodied-ai", "world-action-model", "robot-learning"]
tags: ["being-h", "latent-wam", "vla", "world-action-model", "egocentric-video"]
categories: ["paper-briefs"]
---

## One-Line Takeaway

Being-H0.7 把未来意识从像素级 video rollout 挪到 latent queries 里: 训练时用 future observations 对齐 latent 表示, 推理时只保留 prior branch, 直接出动作。

## Problem

VLA 直接从观测到动作, 容易学到 shortcut。老式 WAM 往往靠测试时未来帧 rollout 来显式建模后果, 但这会把控制变成视频生成, 成本高, 延迟也高。H0.7 想要的是中间态: 保留 future-aware reasoning, 又不让推理期变成像素预测问题。

## Method

官方页的核心设计很清楚: 在 perception 和 action 之间插入 learnable latent queries。训练时, prior branch 只看当前上下文; posterior branch 额外看 future observations; 两条分支在 latent hidden states 上做对齐。这样 prior branch 可以在不看未来帧的情况下学到 future-aware 的结构。

{{< figure src="arch.webp" alt="Being-H0.7 architecture overview" caption="官方架构图：prior / posterior 双分支共享上下文, 只在训练时让 posterior 读取未来观察, 用 latent 对齐替代测试时未来帧生成。" >}}

官方页还给出规模信息: H0.7 用 200,000 小时第一视角人类视频加 15,000 小时机器人示范做训练。部署侧则配合 UAC 和 AMO, 把 upper-body policy、异步 chunk 发送和 whole-body backend 分开处理, 尽量维持在线控制速度。

{{< figure src="benchmark_radar.webp" alt="Being-H0.7 simulation benchmark radar" caption="官方雷达图：H0.7 在多项仿真基准上保持较强而均衡的表现。" >}}

{{< figure src="exp_real_bars.webp" alt="Being-H0.7 real-world suite comparison" caption="官方真实任务对比：H0.7、H0.5、Pi0.5 和 Fast-WAM 在动态场景、物理推理、运动推理、长时序和泛化套件上的差异。" >}}

{{< figure src="inference_cost.webp" alt="Being-H0.7 inference cost comparison" caption="官方推理成本图：UAC 让 H0.7 系列的 step latency 保持在可用范围内, 同时内存占用不算夸张。" >}}

## Why Save It

- 它把 WAM 的“未来感”做成了 latent interface, 而不是推理时的视觉幻觉。
- 它和 Fast-WAM 刚好形成一对: H0.7 证明 latent future-aware reasoning 值得保留, Fast-WAM 证明测试时未来想象未必需要。
- 它是 H0.8 的直接前置: H0.8 把同一条 latent WAM 线推进到 tactile/contact。
- 它也是回看 Being-H0.5 时很好的中间台阶, 能看出这条线如何从统一动作语言走向 future-aware world-action model。

## Limitations Or Questions

- 官方页和 arXiv 都强调 latent query / prior-posterior 结构, 但具体模块拆解仍需要和代码对齐后再细看。
- 当前可以先把 `H0.5 -> H0.7 -> H0.8` 保留为工作假设, 中间接上理解模块、动作模块、视觉编码器、隐式接口和 flow matching action head。
- `InternVL3.5`, `Qwen3`, `V-JEPA2.1`, `Play-LMP` 这些具体名字暂列为待验证清单, 不写成官方已确认事实。
- H0.7 目前更像 bridge model; 它强在把 future-aware reasoning 压进 latent space, 不是靠更重的 test-time rollout。

## Links

- [arXiv:2605.00078](https://arxiv.org/abs/2605.00078)
- [Official project page](https://research.beingbeyond.com/being-h07)
- [GitHub code](https://github.com/BeingBeyond/Being-H)
- [Being-H0.5 official page](https://research.beingbeyond.com/being-h05)
- [WAM survey](/surveys/wam/)
- [Being-H0.8](/resources/being-h08/)
- [Fast-WAM](/paper-briefs/fast-wam-2603-16666/)
