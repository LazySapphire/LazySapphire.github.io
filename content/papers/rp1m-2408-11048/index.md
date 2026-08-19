---
title: "RP1M 论文阅读笔记"
list_title: "RP1M"
description: "用 OT 自动指法训练单曲 RL specialist，再把 100 万级机器人钢琴轨迹用于多任务 imitation learning。"
date: "2026-08-19"
math: true
tags: ["robot-learning", "dexterous-hand", "imitation-learning", "reinforcement-learning", "piano-playing", "dataset"]
topics: ["Dataset", "Pianist", "Robotic"]
categories: ["paper-notes"]
paper_title: "RP1M: A Large-Scale Motion Dataset for Piano Playing with Bi-Manual Dexterous Robot Hands"
authors: ["Yi Zhao", "Le Chen", "Jan Schneider", "Quankai Gao", "Juho Kannala", "Bernhard Schölkopf", "Joni Pajarinen", "Dieter Büchler"]
year: 2024
venue: "CoRL 2024"
arxiv: "2408.11048"
paper_url: "https://arxiv.org/abs/2408.11048"
project_url: "https://rp1m.github.io/"
cover: "fig1_overview.png"
cover_caption: "RP1M 的主线是 OT 自动指法 -> 单曲 RL specialist -> 大规模 motion dataset -> 多任务 imitation learning。"
cover_source: "https://arxiv.org/abs/2408.11048"
cover_credit: "Zhao et al., 2024"
---

论文: **RP1M: A Large-Scale Motion Dataset for Piano Playing with Bi-Manual Dexterous Robot Hands**
版本: arXiv:2408.11048v2, CoRL 2024
链接: [arXiv](https://arxiv.org/abs/2408.11048), [Project](https://rp1m.github.io/)

## 一句话结论

这篇的重点不是“又训练了一个更强的钢琴机器人”，而是把机器人钢琴做成了一个可规模化的数据生产流程: 先用 OT 自动指法训练单曲 specialist，再把 1M 级轨迹拿去训练多任务 imitation learner。

{{< figure src="fig1_overview.png" alt="RP1M overview" caption="论文 Figure 1：从 MIDI 和当前手位出发，用 OT 解决 fingering，再收集 RP1M 训练多任务策略。" >}}

## 它要解决什么

机器人弹钢琴的难点有两个层面。

第一层是控制本身。双手、前臂和 sustain pedal 一起工作，动作维度高，接触切换快，而且每个时间步都要兼顾当前键和未来键。

第二层是数据。过去的 RoboPianist-RL 依赖人工 fingering。这个东西贵，而且不适合不同形态的机器人手。对机器人来说，真正有价值的不是“像人一样怎么按”，而是“在这只手的约束下怎么按得对、按得稳”。

RP1M 的回答很直接: 不再把人工 fingering 当成前提，而是把 finger placement 写成一个 assignment problem。

## 核心方法

### 1. OT 自动指法

在每个时间步，设当前要按的键集合为 $K_t$，手指集合为 $F$。作者定义手指到按键的代价为几何距离，并求一个二值匹配:

$$
\begin{aligned}
d_t^{OT} = \min_{w_t} \quad & \sum_{(i,j)\in K_t \times F} w_t(k_i,f_j)c_t(k_i,f_j) \\
\mathrm{s.t.}\quad
& \sum_{j\in F} w_t(k_i,f_j)=1,\ \forall i\in K_t \\
& \sum_{i\in K_t} w_t(k_i,f_j)\le 1,\ \forall j\in F \\
& w_t(k_i,f_j)\in\{0,1\}
\end{aligned}
$$

这个式子本质上是在当前手位下找最省移动的指法。它不会替你规划整段乐句，只负责把局部探索拉到一个更有意义的方向。

{{< figure src="fig2_ot_fingering_learning.png" alt="OT fingering learning curves" caption="论文 Figure 2：OT 指法几乎能追平带人工 fingering 的 RoboPianist-RL，并明显超过 No Fingering。" >}}

### 2. 单曲 specialist

作者对每首曲子单独训练一个 DroQ specialist。配置上是 8M 环境步、550 步 episode、10 步 lookahead、39 维动作空间。reward 由 key press、sustain、collision、energy 和 OT 距离几部分组成。

这里最重要的不是具体算法名，而是训练范式: 用自动 fingering 把单曲 RL 的标签瓶颈打掉，然后让每首歌都先被学成一个强 specialist。

### 3. RP1M 数据集

RP1M 最终收集了大约 1M 条 expert trajectories，覆盖约 2k 首曲子。作者对每首歌训练一个 specialist，训练 8M 步，然后 rollout 500 次；训练曲库来自 PIG 和 GiantMIDI-Piano 的子集。

这意味着 RP1M 不是“人工标了一点数据”，而是一个靠大规模仿真 + 自动指法堆出来的轨迹库。

{{< figure src="fig3_learned_fingering.png" alt="Learned fingering comparison" caption="论文 Figure 3：机器人自己学到的指法和人类标注并不一样，但能更贴合机器人手的几何约束。" >}}

## 结果怎么看

### specialist 是否真的学到了

作者用 F1 衡量按键是否按对。结果里最有说服力的点有三个:

- OT 指法在多个曲子上接近带人工 fingering 的基线。
- 在《Flight of the Bumblebee》上，3M 步后能到 0.79 F1。
- 换成四指手后，仍能在 `French Suite No.5 Sarabande` 上做到 0.95 F1，几乎不掉。

这说明 OT 的价值不在“模拟人类指法”，而在“给机器人找一套能工作的局部分配规则”。

### 数据质量如何

作者统计了 specialist 的 F1 分布: 79.00% 的 agent 进入 $F1 > 0.75$，99.89% 的 agent 高于 0.5。谱面覆盖也比较正常，中心键更常被按，白键约占 65.7%，而且 90.70% 的曲子落在 1000-4000 个 active keys 之间。

{{< figure src="fig4_dataset_statistics.png" alt="RP1M dataset statistics" caption="论文 Figure 4：按键分布、active key 数量分布和 specialist F1 分布。" >}}

### 多任务 imitation learning 说明了什么

作者把 RP1M 拿来训练 BC-MLP、BeT、DP-U、DP-T，并在 in-distribution 和 OOD 两种设置下评估。

结论很明确:

- 数据越大，OOD 泛化越好。
- Diffusion Policy 通常优于 BC 和 BeT。
- 但 in-distribution 和 RL specialist 之间仍有明显差距。

{{< figure src="table2_multitask_imitation.png" alt="Multi-task imitation learning benchmark" caption="论文 Table 2：RP1M 上的多任务 imitation learning benchmark。" >}}

## 我的判断

这篇最值钱的地方是“数据工厂”而不是某个单独算法。

它把原来依赖人工 fingering 的流程改成了: OT 自动指法 -> specialist -> 大规模轨迹 -> 多任务学习。这个链条一旦成立，后面的 OmniPianist 才有 RP1M++、Flow Matching Transformer 这种更大的扩展空间。

它的局限也很清楚:

- F1 只能衡量按键对不对，不能完整描述音乐性。
- 训练仍然重仿真、重算力。
- 只用 proprioception，离真实演奏的多模态感知还差一截。

## 和 OmniPianist 的关系

如果把 OmniPianist 看成“更大的第二代系统”，那 RP1M 就是它最关键的底座。后来的 RP1M++ 和多任务策略，都是在这条路线往前推。

换句话说，这篇不是旁支，而是后续大规模机器人钢琴学习的起点。
