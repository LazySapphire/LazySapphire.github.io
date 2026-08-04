---
title: "Fast-WAM: Do World Action Models Need Test-time Future Imagination?"
list_title: "Fast-WAM"
date: "2026-08-03"
description: "一篇把 WAM 的训练期视频建模收益与推理期未来想象成本解耦的代表工作。"
cover: "teaser_main.png"
cover_caption: "Fast-WAM 官方项目页主图，概括了从 imagine-then-execute 到 single-pass action prediction 的设计变化。"
cover_source: "https://yuantianyuan01.github.io/FastWAM/"
cover_credit: "Fast-WAM project page"
paper_title: "Fast-WAM: Do World Action Models Need Test-time Future Imagination?"
authors: ["Tianyuan Yuan", "Zibin Dong", "Yicheng Liu", "Hang Zhao"]
year: 2026
venue: "arXiv"
arxiv: "2603.16666"
doi: "10.48550/arXiv.2603.16666"
paper_url: "https://arxiv.org/abs/2603.16666"
project_url: "https://yuantianyuan01.github.io/FastWAM/"
code_url: "https://github.com/yuantianyuan01/FastWAM"
status: "triaged"
reading_level: "brief"
topics: ["robotics", "embodied-ai", "world-action-model", "robot-learning"]
tags: ["fast-wam", "wam", "video-co-training", "latent-world-model", "robot-manipulation", "flow-matching"]
categories: ["paper-briefs"]
---

## One-Line Takeaway

Fast-WAM 的核心结论是：WAM 的主要价值可能更多来自训练期的视频建模/视频协同训练，而不是推理期显式生成未来画面。

## Problem

很多 World Action Model 采用 `imagine-then-execute` 范式：先用视频生成模型迭代预测未来视觉，再基于想象出的未来状态预测动作。这种设计直观，但推理延迟高，而且难以判断性能提升到底来自“训练时学习了物理世界表征”，还是来自“推理时真的生成了未来画面”。

Fast-WAM 直接问了一个对 WAM 领域很关键的问题：测试时的 future imagination 是否必要？

## Method

Fast-WAM 保留训练期的视频协同训练，但推理时跳过未来视频生成。它使用预训练视频 DiT 作为 world modeling backbone，并加入 action expert DiT；训练时同时做 action flow matching 和 future video latent flow matching，让视觉骨干学习动作相关的物理/时序表征。

{{< figure src="model_arch.png" alt="Fast-WAM 模型架构图" caption="官方模型架构图：训练时保留 future video latent 分支作为协同训练信号，推理时移除未来视频分支，只用当前观测形成 latent world representation 并生成动作。" >}}

关键设计是结构化 attention mask：训练时 action tokens 不能访问 future video tokens，避免未来信息泄漏；推理时只保留第一帧观测的 clean latent tokens，经 video backbone 单次编码后供 action expert 使用。

论文还构造了对照变体，包括 joint-generation 风格的 Fast-WAM-Joint、video-then-action 风格的 Fast-WAM-IDM，以及去掉 video co-training 的版本，用来区分“训练目标”和“推理时想象”两件事。

## Why Save It

- 它给 WAM 设计提供了一个强基线：先证明不做 test-time future video generation 也能有竞争力。
- 它把 WAM 的价值来源拆清楚：video co-training 对表征学习的作用，可能比显式生成未来画面更关键。
- 论文报告 Fast-WAM 在 RoboTwin 上达到 91.8% 平均成功率，在 LIBERO 上达到 97.6% 平均成功率，并在真实任务中以约 190 ms latency 运行，比 imagine-then-execute WAM 快 4x 以上。
- 代码、项目页和 Hugging Face checkpoints 都已公开，适合作为后续 WAM 工作的复现实验入口。

## Limitations Or Questions

- 论文当前是 arXiv 版本，后续如有正式会议版本，需要复查实验设置和结论表述。
- Fast-WAM 减少的是推理期视频生成成本；训练期仍然依赖视频协同训练和较大的视频 DiT backbone。
- 结论依赖特定 backbone、benchmark 和 action chunk 设置；在更长时域规划、更强闭环反馈或触觉场景下，显式未来建模是否仍可省略，需要和后续 AHA-WAM、VT-WAM 等工作对比。
- 它更像“WAM 必须先想象未来吗？”这个问题的强反例，不等于否定所有未来预测在机器人控制中的价值。

## Links

- [arXiv:2603.16666](https://arxiv.org/abs/2603.16666)
- [Project page](https://yuantianyuan01.github.io/FastWAM/)
- [GitHub code](https://github.com/yuantianyuan01/FastWAM)
- [Hugging Face checkpoints](https://huggingface.co/yuanty/fastwam)
- [Awesome-WAM entry](https://github.com/OpenMOSS/Awesome-WAM)
