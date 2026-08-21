---
title: "AC-WM 主题综述"
description: "把 action-conditioned video world model 作为 world model 的一条分支，整理 DreamX-Phi 这类以动作注入、几何约束和物理一致性为主的路线。"
date: "2026-08-20"
status: "triaged"
survey_type: "lightweight"
topics: ["robotics", "embodied-ai", "world-model", "action-conditioned-video"]
tags: ["ac-wm", "dreamx-phi", "action-conditioned-video", "action-injection", "prope", "se3", "depth-supervision", "sam3", "v-jepa"]
categories: ["surveys"]
source_count: 1
time_window: "2026-08-13 to 2026-08-13"
timeline_intro: "按时间逆序排列, 把每个项目放到 AC-WM 线的对应分支上。"
timeline_items:
  - title: "DreamX-Phi 1.0"
    date: "2026-08-13"
    url: "/papers/dreamx-phi-2608-13489/"
    side: "left"
    badge: "动作注入代表"
    summary: "DreamX-Phi 把双臂 SE(3) 轨迹、robot-only flow、depth、SAM3 mask 和 V-JEPA 关系监督组合起来，去约束给定 action 下的未来观测。"
    branches:
      - "核心问题: 给定 action 时，未来观测如何更严格地服从动作与物理一致性。"
      - "接口路线: action token、modulation、cross-attention、rendered geometry、flow、PRoPE。"
      - "与 WAM 的关系: 这里更偏 action-conditioned video world model, 和 WAM 属于并行的 world-model 分支。"
---

## 方向解释

AC-WM, Action-Conditioned World Model, 可以先理解为另一条 world model 分支: 它把外部 action 作为条件, 直接建模后续观测如何变化。和 WAM 一样, 它关心动作后的世界变化; 但它更常把 future observation 作为主要输出, 而不是先把动作压进更偏 latent 的接口里。

DreamX-Phi 1.0 是这条线里目前最适合归档的入口: 它不负责生成动作策略本身, 但把动作注入、几何结构、深度、mask 和关系监督串成了一条完整的 action-conditioned video 路线。

## 当前关注点

- **动作怎么进入模型**: token、modulation、cross-attention、flow 和 $SE(3)$ attention 是几类可比较接口。
- **物体怎么响应动作**: 深度、SAM3 mask 和 V-JEPA 关系监督分别回答几何、显著区域和状态连贯性。
- **与 WAM 的分界**: AC-WM 更偏给定 action 的 future observation 建模, WAM 则更强调 world-action interface 和 action-related latent state。

## 阅读优先级

如果要继续沿着 AC-WM 走, 先看 DreamX-Phi 1.0 的结构化动作注入, 再拿 WAM 主题综述做对照, 最后看 PointWorld 这类 3D point-flow 路线, 观察 action-conditioned 世界模型是否一定要停留在 2D 视频空间。

## Related Reading

- [DreamX-Phi 1.0](/papers/dreamx-phi-2608-13489/)
- [WAM 主题综述](/surveys/wam/)
- [PointWorld: Scaling 3D World Models for In-The-Wild Robotic Manipulation](https://arxiv.org/abs/2601.03782)
- [V-JEPA 2](https://arxiv.org/abs/2506.09985)
- [V-JEPA 2.1](https://arxiv.org/abs/2603.14482)
- [DINOv3](https://arxiv.org/abs/2508.10104)
- [2026-08-20 组会讨论复盘](/notes/2026-08-20-action-conditioned-world-models/)
