---
title: "OmniPianist 论文阅读笔记"
list_title: "OmniPianist"
description: "用 OT 自动指法替代人工 fingering，再用 RP1M++ 和 Flow Matching Transformer 训练多曲目机器人钢琴策略。"
date: "2026-08-18"
math: true
tags: ["robot-learning", "dexterous-hand", "reinforcement-learning", "imitation-learning", "flow-matching", "piano-playing"]
topics: ["Pianist", "Robotic"]
categories: ["paper-notes"]
paper_title: "Dexterous Robotic Piano Playing at Scale"
authors: ["Le Chen", "Yi Zhao", "Jan Schneider", "Quankai Gao", "Simon Guist", "Cheng Qian", "Juho Kannala", "Bernhard Schölkopf", "Joni Pajarinen", "Dieter Büchler"]
year: 2025
venue: "arXiv"
arxiv: "2511.02504"
doi: "10.48550/arXiv.2511.02504"
paper_url: "https://arxiv.org/abs/2511.02504"
cover: "fig1_overview.png"
cover_caption: "论文 Figure 1：从 OT 自动指法训练单曲 RL specialist，到收集 RP1M++，再通过 imitation learning 训练多曲目 OmniPianist。"
cover_source: "https://arxiv.org/abs/2511.02504"
cover_credit: "Chen et al., 2025"
---

论文: **Dexterous Robotic Piano Playing at Scale**
作者: Le Chen, Yi Zhao, Jan Schneider, Quankai Gao, Simon Guist, Cheng Qian, Juho Kannala, Bernhard Schölkopf, Joni Pajarinen, Dieter Büchler
版本: arXiv:2511.02504v1, submitted 2025-11-04
链接: [arXiv](https://arxiv.org/abs/2511.02504)

## 一句话结论

OmniPianist 的主线不是让机器人模仿人类演奏视频，而是把机器人钢琴学习做成一个可规模化的数据工厂: 先用 **Optimal Transport** 在每个时刻自动给当前按键分配手指，训练 2000 多个单曲 RL specialist；再用 DAgger 风格重标注把 specialist 经验扩成更宽状态分布的 **RP1M++**；最后用 **Flow Matching Transformer** 做大规模 imitation learning，得到一个能覆盖近千首曲目的多任务策略。

{{< figure src="fig1_overview.png" alt="OmniPianist overview" caption="论文 Figure 1：核心流程是 RL specialist -> RP1M++ -> multi-task agent。OT 指法解决标注瓶颈，RP1M++ 解决轨迹分布太窄的问题，Flow Matching Transformer 提供足够强的策略表达能力。" >}}

我对这篇的判断: 真正关键的贡献是**数据生成链路**。OT 指法让作者不再依赖人工 fingering；RP1M++ 让行为克隆看到更多 off-expert states；FMT 则是在数据足够大之后才体现优势。单独看任一模块都不算离谱复杂，组合起来才形成规模化路线。

## 论文想解决的问题

机器人弹钢琴比普通 dexterous manipulation 更苛刻。它同时需要:

- 高维双手控制: 两只 Shadow Hand，加前臂位置和 sustain pedal，总动作维度是 39。
- 高精度接触: 必须在正确时间按下正确琴键，同时不能误触 inactive keys。
- 快速动态动作: 音符间隔短，节奏和接触切换频繁。
- 长时序规划: 当前指法不能只服务当前音符，还要为后续音符留位置。
- 多任务泛化: 单曲 RL 可以练出来，但一个策略要覆盖数百或上千首曲子很难。

早期 RoboPianist-RL 使用人类标注的 fingering 作为 observation 和 dense reward 的一部分。这让探索问题变简单，但带来两个硬瓶颈:

1. 人工指法标注贵，绝大多数 MIDI 或网络曲谱没有这种逐时刻 fingering。
2. 人类指法未必适合机器人手。机器人手的关节限制、手指长度、可达范围都和人不同。

这篇论文的核心问题就是: **如果没有人工 fingering 和人类演示，能不能规模化训练机器人弹很多首曲子，并把这些单曲经验蒸馏进一个多曲目策略?**

## 任务定义

环境基于 RoboPianist。仿真里有 88 键钢琴、两个 Shadow robot hands 和一个 pseudo sustain pedal。曲谱用 MIDI 表示，每个时间步给出当前应按下的 active keys，以及 sustain pedal 目标。

Observation 由几部分组成:

- 当前和未来若干步的 piano goal state，88 维 key target 加 1 维 sustain target。
- 当前 piano key joints 和 sustain state。
- 两只手的 fingertip positions。
- 双手本体状态。

论文主设定使用 10 步 lookahead，最终 observation 维度是 1144。这个 lookahead 很重要: OT 指法本身是当前时刻的 assignment，但 RL policy 能看到未来目标，因此仍可能学到为后续音符预摆位的动作。

Action 维度是 39，包括双手关节目标、前臂位置和 sustain pedal 控制。评估使用 F1:

$$
F1 = \frac{2 \cdot precision \cdot recall}{precision + recall}
$$

这里 recall 衡量 active keys 有没有被按下，precision 衡量 inactive keys 有没有被误按。这个指标适合检查“音符是否按对”，但它不完整衡量音乐表现力，例如触键力度、音色、legato、rubato 和真实钢琴动态。

## 方法主线

整篇方法可以压成三层:

```text
1. OT automatic fingering
   每个时间步把 active keys 分配给机器人手指
   给 RL specialist 提供 dense reward

2. RP1M++ data collection
   训练每首曲子的 RL specialist
   再用 DAgger-style relabeling 扩大状态分布覆盖

3. OmniPianist multi-task policy
   用 Flow Matching Transformer 从 RP1M++ 学一个多曲目策略
```

下面逐层拆。

## 1. OT 自动指法

RoboPianist-RL 原本的问题是: 如果没有 fingering，奖励太稀疏，agent 很难知道哪个手指该往哪个键移动。OmniPianist 的做法是把“指法”改写成一个在线 assignment problem。

在时间步 $t$，设当前需要按下的键集合为 $K_t$，可用手指集合为 $F$。对每个键 $k_i$ 和每个手指 $f_j$，定义代价:

$$
c_t(k_i, f_j) = \|x(k_i) - x(f_j)\|_2
$$

也就是琴键位置和指尖位置之间的欧氏距离。然后求一个二值分配 $w_t(k_i, f_j)$:

$$
\begin{aligned}
d_t^{OT} =
\min_{w_t} \quad & \sum_{(i,j)\in K_t \times F}
w_t(k_i,f_j)c_t(k_i,f_j) \\
\mathrm{s.t.}\quad
& \sum_{j \in F} w_t(k_i,f_j) = 1,\quad \forall i \in K_t \\
& \sum_{i \in K_t} w_t(k_i,f_j) \le 1,\quad \forall j \in F \\
& w_t(k_i,f_j) \in \{0,1\}
\end{aligned}
$$

约束含义很直接:

- 每个 active key 必须由一个手指负责。
- 每个手指最多负责一个 key。
- 总移动距离最小。

论文用 modified Jonker-Volgenant algorithm 求这个 assignment。得到的 $d_t^{OT}$ 再转成 dense reward:

$$
r_t^{OT} =
\begin{cases}
\exp(c(d_t^{OT} - \delta)^2), & d_t^{OT} \ge \delta \\
1, & d_t^{OT} < \delta
\end{cases}
$$

其中 $c$ 是负的缩放系数，$\delta = 0.01$。直观上，指尖越靠近被分配的目标键，奖励越高；到达阈值内后奖励封顶为 1。

总 reward 是:

$$
r_t =
r_t^{OT}
+ r_t^{Press}
+ r_t^{Sustain}
+ \alpha_1 r_t^{Collision}
+ \alpha_2 r_t^{Energy}
$$

这里 $r_t^{Press}$ 奖励按对 active keys 且不误按 inactive keys，$r_t^{Sustain}$ 处理 sustain pedal，$r_t^{Collision}$ 惩罚碰撞，$r_t^{Energy}$ 惩罚能耗。

### 这个 OT 指法到底解决了什么

它解决的是**局部探索引导**，不是完整音乐指法规划。

好处:

- 不需要人类 fingering annotation。
- 不需要人类演奏视频。
- 每个时间步根据当前机器人手的位置重新分配，因此能适配机器人实际形态。
- 同一个机制可迁移到 Shadow、Allegro、ORCA 等不同 hand embodiment。

局限:

- 这是当前 active keys 到当前 fingertips 的最短距离 assignment，天然偏局部。
- 它不直接建模音乐 phrasing 或长时序指法美学。
- 如果一个时间步 active keys 多于可用手指数，按论文里的约束形式会变成不可行问题；实际数据和环境中这类情况需要被过滤、简化或另行处理。
- 它鼓励“能按到”，但不保证真实钢琴演奏中的力度、连贯性和表达。

论文的实验证明的是: 对机器人学习而言，这个局部 OT reward 已经足够把“没有指法时很难探索”的问题显著缓解。

## 2. 单曲 RL specialist

作者为每个 music clip 训练一个 specialist agent。RL 算法使用 DroQ，这是带 Dropout 和 LayerNorm Q function 的 model-free off-policy 方法。核心训练配置:

| 项目 | 设置 |
| --- | --- |
| RL 算法 | DroQ |
| 每个 specialist 训练步数 | 8M environment steps |
| Episode length | 550 steps |
| Control timestep | 0.05 s |
| 每段音乐长度 | 约 27.5 s |
| Batch size | 256 |
| Replay buffer | 1M |
| Lookahead | 10 steps |
| Action dimension | 39 |

数据源来自 PIG dataset 和 GiantMIDI-Piano 的一个子集。论文报告训练了 2089 个 RL agents，每个 agent 约 21 小时，总数据收集成本约:

$$
21 \times 2089 = 43869
$$

GPU hours。

这个数字值得注意。论文说 OT 让训练“低成本”，这里的低成本主要是相对人工标注和人类演示而言，不是说算力成本低。它仍然是一个重仿真、重并行的数据生产流程。

## 3. 从 RP1M 到 RP1M++

论文继承了作者之前的 RP1M 工作。RP1M 已经有约 100 万 expert trajectories，覆盖约 2000 个 music clips。但原始 RP1M 有一个很关键的问题: **轨迹分布太窄**。

原因是每首曲子用同一个训练好的 expert policy rollout 500 次。训练充分后，expert policy 的动作分布会很集中，即使有 stochastic sampling，不同轨迹也高度相似。这样训练 behavior cloning 时会出现经典 covariate shift:

```text
BC policy 稍微偏离 expert trajectory
    -> 进入训练集很少覆盖的 state
    -> policy 不知道如何纠正
    -> 误差继续累积
```

RP1M++ 的修正是 DAgger 风格的数据重标注。

流程是:

1. 对每个 music clip，加载已经训练好的 RL expert policy $\pi_{RL}$。
2. 随机初始化 student policy $\pi_\phi$。
3. 让 student 和环境交互，访问 student 自己会走到的 states。
4. 对这些 states，用 expert 重新给动作标签:

$$
\tilde{a}_t = \pi_{RL}(\cdot \mid o_t)
$$

5. 保存 $(o_t, \tilde{a}_t)$，并用 behavior cloning 更新 student。
6. 重复直到 student 的 episodic return 接近 expert。

这样收集到的数据不再只是 expert manifold 上的窄轨迹，而是包含 student 训练过程中大量中间策略访问过的 states。它更适合训练一个多曲目 learner，因为 learner 推理时也不可能永远贴着 expert rollout。

{{< figure src="fig7_rp1m_plus_plus_comparison.png" alt="RP1M++ comparison" caption="论文 Figure 7：RP1M++ 在 12-song 子集上比 RP1M 训练更快、更稳；PCA/KDE 可视化显示 RP1M++ 的状态分布覆盖更宽。" >}}

论文给出的数据规模和质量统计:

- RP1M 和 RP1M++ 都包含 1053 unique songs、2091 music clips。
- 轨迹规模超过 100 万。
- 79.00% 的 specialist agents 达到 F1 > 0.75。
- 99.89% 的 specialist agents 达到 F1 > 0.5。
- 数据集中 white keys 占 pressed keys 的 65.7%。
- 90.70% 的 musical pieces 包含 1000 到 4000 个 active keys。

这些统计有两个用途。第一，它证明 specialist 数据不是纯噪声，绝大多数 agent 至少能弹到可用质量。第二，它提醒我们: 数据分布仍由 MIDI 曲库和机器人可达性决定，不是任意钢琴曲都等价可学。

## 4. Flow Matching Transformer

有了 RP1M++ 后，作者训练多曲目 agent OmniPianist。这里不用普通 MLP policy，而是用 Flow Matching Transformer。

{{< figure src="fig3_flow_matching_transformer.png" alt="Flow Matching Transformer architecture" caption="论文 Figure 3：FMT 把 noised action sequence 当作 tokens，用 observation tokens 和 flow timestep 做条件，通过 decoder cross-attention 生成 denoised actions。" >}}

Flow Matching Policy 的训练可以这样理解。设 expert action sequence 是 $a_1$，随机噪声 action sequence 是:

$$
a_0 \sim \mathcal{N}(0,I)
$$

采样时间 $t \sim U[0,1]$，做线性插值:

$$
a_t = (1 - t)a_0 + t a_1
$$

模型学习一个条件速度场 $u_\theta(a_t,t\mid s)$，目标是从噪声流向 expert action:

$$
\mathcal{L}(\theta) =
\mathbb{E}_{t,a_0,a_1}
\left[
\left\|
u_\theta(a_t,t\mid s) - (a_1 - a_0)
\right\|^2
\right]
$$

推理时，从噪声动作开始，沿学到的 ODE velocity field 积分:

$$
a_1 = a_0 + \int_0^1 u_\theta(a_t,t,s)dt
$$

论文使用 Euler solver，inference steps 为 10。

### FMT 架构细节

模型条件包括:

- MIDI goal。
- fingertip positions。
- robot hand states。
- piano states。
- flow matching timestep。

Action side 使用 noised action tokens，加入 positional embeddings 后进入非因果 Transformer decoder。Observation side 经过线性投影和 per-token MLP，作为 decoder cross-attention 的 memory。论文主配置:

| 项目 | 设置 |
| --- | --- |
| Transformer layers | 12 |
| Attention heads | 12 |
| Embedding dim | 768 |
| Attention dropout | 0.1 |
| Prediction horizon | 4 |
| Action horizon | 1 |
| Observation horizon | 2 |
| Batch size | 10000 |
| Epochs | 2000 |
| Optimizer | AdamW |
| Learning rate | 1e-4 |
| Weight decay | 1e-3 |
| Precision | BF16，attention 使用 FP32 |
| Inference steps | 10 Euler steps |

这里的关键不是“flow matching 比 diffusion 一定更好”，而是两个点:

1. Flow matching 的训练目标是直接 velocity regression，比 DDPM 式逐步去噪少一些调度超参。
2. Transformer policy 比 U-Net policy 更能吃下多曲目、长时序、高维动作条件。

实验里这两个点是一起出现的: U-Net Flow Matching 比 DDIM 好一点，但真正明显领先的是 Flow Matching Transformer。

## 5. 单曲 specialist 实验

论文首先验证 OT 指法对 RL specialist 是否真的有用。比较对象有三组:

- RoboPianist-RL with human fingering: observation 和 reward 都用人类 fingering。
- OT, ours: 不使用人类 fingering，用 OT 指法 reward。
- No Fingering: 移除 fingering 引导。

结果是: OT 版本在 Piano Sonata No.23 和 French Suite No.5 等曲子上基本追平 human-fingering baseline，同时大幅超过 No Fingering。说明 dense finger-placement reward 对探索非常关键，而这个 reward 不必来自人类标注。

论文还测试了《Flight of the Bumblebee》这种高难曲，3M training steps 后达到 0.79 F1。作者称这是首次用 general-purpose bimanual dexterous robot hands 弹这首曲子。

### 学到的指法不是人类指法

论文 Figure 5 比较了 French Suite No.5 Sarabande 的人类 fingering 和 OT 学到的策略。机器人常会选择和人不同的手指。例如某些位置人类用食指和无名指，但机器人手由于机械限制无法覆盖这个跨度，于是 agent 改用拇指和小指。

这点其实是 OT 指法最重要的意义之一: 它不是想复刻人类演奏习惯，而是允许机器人发现**自己身体可执行的**指法。对非人形手或不同自由度机械手，这比直接迁移人类 fingering 更合理。

### Cross-embodiment

作者还把同一方法放到 Shadow、Allegro、ORCA 三种 robot hands 上，在 Piano Sonata No.23 和 French Suite No.5 上测试。不同 hand 的学习速度不同，但最终都能收敛到相近表现。这说明 OT assignment 依赖的是当前指尖位置和目标键位置，不绑定具体手型。

这部分实验支持论文的一个更广泛主张: 如果 reward construction 不依赖人类手指标签，就更容易迁移到不同 robot morphology。

## 6. 多曲目 learner 实验

多曲目实验回答三个问题:

1. RP1M++ 是否比 RP1M 更适合 imitation learning?
2. Flow Matching Transformer 是否优于 U-Net DDIM / U-Net Flow Matching?
3. 数据规模变大时，in-distribution 和 out-of-distribution 表现如何变化?

训练集规模包括 12、150、300、500、700、900 songs，小集合是大集合的 strict subset。评估分两类:

- In-distribution: 训练集内的 RoboPianist-ETUDE-12 songs。
- Out-of-distribution: 100 首来自 GiantMIDI-Piano、未出现在训练集中的 songs。

### RP1M++ vs RP1M

Figure 7 左图显示，用同样 12-song 子集训练时，RP1M++ 上的 DDIM、FM、FMT 都明显优于 RP1M。中间和右侧 KDE 图也说明 RP1M++ 状态覆盖更宽。

我的理解: RP1M++ 并不是简单“更多数据”，而是**同一首歌内部更多样的状态分布**。对行为克隆而言，这比重复 expert rollout 更重要。因为多任务 policy 一旦在某一步偏离 expert，是否能恢复取决于训练集中有没有类似偏离状态。

### 策略表示对比

Figure 8 给出的数值很清楚:

| Training songs | Policy | In-distribution F1 | Out-of-distribution F1 |
| ---: | --- | ---: | ---: |
| 12 | DDIM U-Net | 0.832 | 0.087 |
| 12 | FM U-Net | 0.835 | 0.077 |
| 12 | FMT | 0.864 | 0.086 |
| 300 | DDIM U-Net | 0.447 | 0.228 |
| 300 | FM U-Net | 0.581 | 0.232 |
| 300 | FMT | 0.842 | 0.397 |

{{< figure src="fig8_policy_representation_comparison.png" alt="Policy representation comparison" caption="论文 Figure 8：12 首训练曲时三种模型都能记住训练曲，但 OOD 几乎不行；300 首训练曲时，FMT 同时保住 ID 表现并显著提升 OOD。" >}}

这个结果的关键信息:

- 12-song 时，三种 policy 都能拟合训练曲，说明小规模 memorization 不是难点。
- 12-song 的 OOD 都很低，说明少量曲目无法产生 sight-reading 式泛化。
- 300-song 后，U-Net DDIM / FM 的 ID 表现反而明显下降，说明模型容量或表示形式吃不下更复杂数据。
- FMT 在 300-song 时 ID 仍有 0.842，OOD 提到 0.397，是唯一同时兼顾拟合和泛化的表示。

### 数据 scaling law

Figure 9 展示只用 FMT 时，训练曲目数量从 12 增到 900 的趋势。

{{< figure src="fig9_data_scaling_law.png" alt="Data scaling law" caption="论文 Figure 9：训练曲目越多，OOD F1 越高；ID F1 略有下降，但整体仍保持较高水平。" >}}

论文文字总结为:

- In-distribution mean F1 从约 0.86 轻微降到约 0.80。
- Out-of-distribution mean F1 随数据增加单调上升。
- 900 songs 训练后，在 100 首 novel songs 上平均 F1 约 0.55。

这说明 OmniPianist 已经有一定“看新谱弹奏”的能力，但也不能过度解读。0.55 F1 对机器人弹琴是不错进展，但离熟练人类 pianist 的泛化和表达能力还很远。标题里“human-level dexterity”的表述更像长期目标，不是这篇已经解决了人类级钢琴演奏。

## 这篇论文真正的贡献

我觉得可以分成四点:

1. **把 fingering 从人工监督改成在线优化问题。**
   这让机器人不必等待人类逐音符标注，也不用人类演奏视频。

2. **证明单曲 specialist 可以作为规模化数据工厂。**
   2000 多个 specialist 不是最终目标，而是生产可蒸馏轨迹。

3. **指出 RP1M 的核心问题不是量不够，而是状态分布太窄。**
   RP1M++ 用 DAgger-style relabeling 补的是 intra-song diversity。

4. **在多曲目 imitation learning 里验证了 FMT 的必要性。**
   当训练曲数增加到 300 以上，U-Net policy 明显撑不住，Transformer 才保住 ID 并提升 OOD。

这四点串起来，论文的意义就不只是“机器人会弹更多曲子”，而是提出了一条机器人 dexterous skill scaling 的范式:

```text
自动构造 dense task guidance
    -> 大量训练 task specialists
    -> 用更宽状态分布收集数据
    -> 用表达能力足够强的 generative policy 蒸馏多任务能力
```

## 和 RoboPianist / RP1M 的关系

这篇不是从零开始的新 benchmark，而是接在两条已有工作之后:

- **RoboPianist** 提供了双手机器人钢琴环境、MIDI 任务定义、F1 指标和早期 RL/MT baseline。
- **RP1M** 把单曲 expert trajectories 扩成约百万规模数据集，并已经使用 OT 思路减轻 fingering 标注依赖。
- **OmniPianist** 进一步分析为什么 RP1M 上多曲目 BC 会掉性能，并用 RP1M++ 和 FMT 修复。

所以如果要复现或继续研究，合理路线不是直接从 OmniPianist 论文公式开始，而是先跑通 RoboPianist 环境，再理解 RP1M 的数据结构和 task naming，最后再看 RP1M++ 的 relabeling 与 FMT policy。

## 局限与后续问题

### 1. 仍然是仿真工作

论文主要证据来自 RoboPianist 仿真。没有报告真实 Shadow Hand 或其他真实双手机器人上的 sim2real 弹奏结果。钢琴接触、摩擦、键盘机构、执行器延迟和触键力度在真实世界里都可能改变结论。

### 2. F1 不等于音乐质量

F1 适合评估按键正确性，但音乐演奏还需要 timing nuance、velocity control、phrasing、legato 和 sustain 表达。这篇的目标更偏“机器人能按对大量 MIDI 音符”，不是完整音乐审美。

### 3. OT 指法是局部 assignment

OT reward 解决了当前 fingers-to-keys 的 dense guidance，但它不直接解决长时序指法规划。真实钢琴指法经常为了后面几小节牺牲当前最短移动距离。论文靠 RL observation 里的未来 goal lookahead 弥补一部分，但 OT 本身仍是当前步局部优化。

### 4. 算力成本很高

43,869 GPU-hours 的 specialist collection 对普通实验室仍然昂贵。它换掉的是人工标注成本，不是训练成本。

### 5. 数据和代码开放状态需要跟进

论文 v1 写的是 datasets、models 和 code 会在接收后开放。公开复现时要重新检查项目页、代码仓库、RP1M++ 下载、license 和 specialist checkpoint 是否真的可用。

### 6. OOD 泛化还只是起点

100 首未见曲目平均 F1 约 0.55 是重要进展，但还不能称为稳定 sight-reading。尤其对高密度和高速度曲目，机械限制与策略误差会继续放大。

## 对后续实验的启发

如果要把这篇思想迁到别的 dexterous task，我会优先看三件事。

第一，能不能构造类似 OT 指法的**自动 dense guidance**。例如多指抓取里，把 fingertips 和 contact candidates 做 assignment；灵巧操作里，把关键接触点和手指/掌面区域做 matching。

第二，数据收集不要只存成功 expert rollouts。RP1M++ 的教训是: 对 imitation learning，off-manifold correction states 很重要。可以用 DAgger、relabeling、noise rollout 或 failed recovery trajectories 扩大状态覆盖。

第三，多任务策略的模型容量要和数据复杂度匹配。小数据下普通 policy 也能记住训练任务；真正扩到几百任务时，Transformer / generative sequence policy 的优势才明显。

## 当前阅读结论

OmniPianist 最值得保存的地方，是它把一个看起来高度依赖人类技巧的任务，改造成了可自动标注、可并行训练、可蒸馏的大规模 robot learning pipeline。

它还没有解决真实机器人音乐演奏，也没有证明人类级表达能力。但在“如何让 dexterous robot 从上千个 contact-rich dynamic tasks 中学习通用策略”这个问题上，它提供了一个很清晰的工程答案: 先用任务结构自动生成探索信号，再用大量 specialists 制造数据，最后用足够强的序列生成策略做统一 imitation learning。
