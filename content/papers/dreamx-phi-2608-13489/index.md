---
title: "DreamX-Phi 1.0 论文阅读笔记"
list_title: "DreamX-Phi 1.0"
date: "2026-08-20"
description: "面向机器人操作的 action-conditioned video world model，作为 AC-WM 分支的代表性笔记，重点讨论如何把双臂 SE(3) 动作结构注入视频生成器，并用深度、物体 mask 和 V-JEPA 关系监督约束物理一致性。"
math: true
paper_title: "DreamX-Phi 1.0: Action-Conditioned Video World Model for Robotic Manipulation"
authors: ["DreamX Team", "Rui Chen", "Xiangxiang Chu", "Geng Li", "Jifan Li", "Qingfeng Shi", "Datao Tang", "Jing Tang", "Jun Wang", "Pengfei Zhang"]
year: 2026
venue: "arXiv"
arxiv: "2608.13489"
doi: "10.48550/arXiv.2608.13489"
paper_url: "https://arxiv.org/abs/2608.13489"
project_url: "https://github.com/AMAP-ML/DreamX-Phi"
status: "current"
reading_level: "deep"
topics: ["AC-WM", "Robotic"]
tags: ["dreamx-phi", "ac-wm", "action-conditioned-video", "world-model", "action-injection", "prope", "se3", "bimanual-manipulation", "point-flow", "depth-supervision", "sam3", "v-jepa", "dmd"]
categories: ["paper-notes"]
---

## One-Line Takeaway

DreamX-Phi 1.0 的核心不是让视频“看起来像机器人在动”，而是让给定的双臂动作轨迹真正约束生成结果：作为 AC-WM 分支的一篇代表工作，它用 **arm-specific PRoPE attention** 保留双臂的相对刚体运动结构，再用 robot-only flow、深度监督、SAM3 物体 mask 和冻结 V-JEPA 的关系损失约束动作后果。

不过需要先划清边界：论文当前实现的是 **Forward Dynamics Model (FDM)**。它接收外部给定的动作序列并预测未来视频，不负责生成动作本身。因此它可以作为 AC-WM 的视频/动力学组件，也能和 WAM 一起比较，但还不是一个完整的 joint World Action Model。

## Paper Identity

- 论文：DreamX-Phi 1.0: Action-Conditioned Video World Model for Robotic Manipulation
- 版本：arXiv v1，2026 年 8 月 13 日提交
- 基座：Wan2.2-TI2V-5B video diffusion transformer
- 条件：首帧 RGB、语言指令、双臂 end-effector pose trajectory、gripper state
- 目标：建模
  $$
  p_\theta(x_{1:T}\mid x_0,a_{1:T},c)
  $$
- 评估：WorldArena 1.0 / 2.0，主要覆盖 RoboTwin 2.0 相关设置

## Problem

视频生成器可以生成非常逼真的运动，但“逼真”不等于“服从动作”。在机器人场景中，模型可能出现几类关键失败：

- 左右手臂身份混淆，动作跑到了另一只手上。
- 末端执行器没有沿着指定轨迹运动。
- 夹爪看似接触物体，实际没有产生对应的物体响应。
- 抓取后物体的外观、形状或身份发生漂移。
- 静态背景占据了大多数像素，使全局 RGB loss 淹没接触区域的错误。

论文因此把问题拆成两个层面：

1. **Action fidelity**：生成的机器人运动是否遵循外部规定的动作轨迹。
2. **Physical consistency**：物体是否以与接触和几何结构相符的方式响应动作。

仅仅把 action embedding 注入视频生成器，可能解决“知道有动作”，但不一定解决“动作发生在哪里”以及“物体如何响应”。

## Action Injection Map

论文在 related work 中把 WAM / action-conditioned video model 的接口大致归纳为几条路线。这也是这篇论文对组会上“各种 action 注入方式”的直接价值。

### 1. Concatenation or Action Tokens

把低维动作编码成 token，和视频 token、文本 token 拼接，或作为额外条件输入 Transformer。

优点：

- 接口简单，容易适配不同的动作空间。
- 适合把 action 当作通用条件信号接入预训练生成器。

缺点：

- 刚体运动关系不会自动保留。
- 需要模型自己学习“哪一段 token 对应哪只手、哪一段图像区域”。
- 对连续的 $SE(3)$ 轨迹来说，几何结构是隐式的。

### 2. Feature-wise Modulation / Adapter

用 action feature 对中间视觉特征进行调制，例如加性偏置、缩放或 adapter 分支。

优点：

- 对原有视频 backbone 的侵入较小。
- 可以让预训练路径保持相对稳定。

缺点：

- 几何关系仍然主要依靠特征调制后的网络自行推断。
- 若动作条件只作用在少数层，长时间轨迹和多实体身份可能难以保持。

### 3. Cross-attention

让视频特征通过 cross-attention 读取动作 token 或动作分支。

优点：

- 可以显式建立 visual token 与 action token 的信息交互。
- 适合异构条件或多模态输入。

缺点：

- action token 仍然可能是空间上无定位的抽象向量。
- cross-attention 解决的是信息读取，不等价于保留刚体变换结构。

### 4. Rendered Geometry / Skeleton / Robot Flow

把动作渲染成图像中的机器人骨架、机器人几何或 optical flow，再作为空间对齐的条件。

优点：

- 动作影响的位置更直观。
- 可以把机器人动作和图像空间中的局部变化联系起来。

缺点：

- 渲染结果依赖相机、机器人模型和标定。
- skeleton 或 mask 可能只表达几何外形，不足以表达连续的刚体轨迹和物体响应。
- 2D flow 仍然可能缺少深度和遮挡关系。

### 5. DreamX-Phi: Structured Geometry plus Image-space Cue

DreamX-Phi 不把动作压成单个 generic control embedding，而是同时保留两个层面：

- **3D trajectory structure**：用双臂 end-effector 的 $SE(3)$ 轨迹，并通过 PRoPE-style attention 注入。
- **Image-aligned consequence cue**：使用 robot-only flow，把机器人动作在图像空间中的运动线索提供给视频模型。

论文的关键判断是：几何结构和图像空间定位是互补的。前者回答“机器人在三维空间中怎样动”，后者回答“这个运动应该在图像哪里出现”。

## Method

### 1. Action Representation

在时间 $t$，第 $k$ 个手臂的动作由以下变量描述：

- 末端位置 $\mathbf{p}_t^k$
- 四元数 $\mathbf{q}_t^k$，转换为旋转矩阵 $\mathbf{R}_t^k$
- 夹爪标量 $g_t^k$

论文先构造末端坐标变换：

$$
G_t^k =
\begin{bmatrix}
R_t^k & p_t^k \\
0^\top & 1
\end{bmatrix}.
$$

随后以第一只手臂的初始姿态作为参考：

$$
\bar G_t^k = (G_1^1)^{-1}G_t^k.
$$

这样做的目的不是保留全局 workspace 坐标，而是把不同手臂的轨迹放入共享参考系中，并降低全局坐标系选择对学习的影响。

平移部分还按整段动作的运动幅度归一化，而不是按两只手臂的静止间距归一化。论文的直觉是：动作条件应该反映“动了多少”，而不是被两只手臂的初始距离支配。

### 2. Arm-grouped PRoPE Attention

论文把 PRoPE 的 group-action attention 机制从相机几何场景改造成机器人末端轨迹条件：

- 每只手臂分配一组固定的 attention heads。
- 同一手臂、同一 latent frame 的 token 共享对应的变换。
- 变换作用于 $Q$、$K$、$V$ 以及输出。
- token pair 之间通过相对运动 $D_iD_j^{-1}$ 发生耦合，而不是依赖绝对坐标。

这不是把 action feature 简单加到 hidden state 上，而是改变 action branch 中 attention 的几何关系。更接近“把已知的相对刚体变换写进注意力”，而不是“让网络从向量中猜出刚体变换”。

### 3. Gripper State Injection

夹爪开合是标量，不能直接表示成 $SE(3)$ 变换。因此论文单独使用 per-arm bias：

$$
b_t^k = W_g g_t^k + b_g.
$$

这个 bias 被广播到对应手臂的 attention heads。几何变换和夹爪状态因而采用不同接口：

- pose：进入 PRoPE 几何分支；
- gripper：进入对应 head 的标量 bias。

几何 residual branch 的输出投影和 gripper adapter 都零初始化，使得训练开始时新增 action 分支不会立即破坏预训练的 RGB 生成路径。

### 4. Auxiliary Depth Branch

RGB loss 可以学习外观和运动，但不一定显式学习表面前后顺序、物体空间范围、接触几何和遮挡关系。

DreamX-Phi 添加一个轻量 depth branch：

- 深度图复制到三个通道，使用同一个冻结 RGB VAE 编码；
- RGB Transformer 的前部作为共享 trunk；
- 复制尾部若干 block 形成 depth branch；
- depth branch 可以通过 cross-attention 读取 RGB branch 的 key/value；
- RGB branch 不反向读取 depth branch；
- 直接在 latent depth 上用 MSE 监督。

这个单向结构的工程含义是：深度只在训练时提供几何约束，部署时不需要额外深度输入，也不改变 RGB 主路径的 forward。

### 5. SAM3 Mask-weighted RGB Loss

操控物体通常只占图像很小区域，因此全局 RGB loss 容易被静态背景主导。论文离线使用 SAM3 生成被操作物体的 mask，并把 mask 只用于监督：

- mask 区域的 token 获得更高 loss 权重；
- mask 不参与联合训练；
- 推理时不需要 SAM3 mask；
- 没有有效 mask 的 clip 保持均匀权重。

它解决的是“错误发生在哪里更重要”的问题，但并不单独保证物体跨时间的身份和状态一致。

### 6. Frozen V-JEPA Relational Supervision

DreamX-Phi 用冻结 V-JEPA teacher 约束被操作物体的时空关系，而不是直接要求 student feature 逐维复制 teacher feature。

论文具体对齐的是 token feature 的 Gram matrix：

$$
\begin{aligned}
\ell_{\mathrm{JEPA}}^{(b)}
&=
\frac{1}{M_b^2}
\left\|
S_bS_b^\top-Q_bQ_b^\top
\right\|_1.
\end{aligned}
$$

这样约束的是 token 之间的关系结构，而不是 teacher 的特征坐标系本身。论文希望通过这个目标保持 object identity、object shape、contact interval 内的时序关系，以及抓取后物体演化的连贯性。

需要注意：V-JEPA 在这里不是直接生成未来，也不是 action policy，而是作为 frozen representation teacher 给视频模型施加物体关系约束。

### 7. Few-step Distillation

最后，论文使用 DMD 风格的 distribution-matching distillation，并结合带噪声的 adversarial objective，把多步视频生成器蒸馏成 few-step student。

条件元组在蒸馏时保持完整：

$$
y=(x_0,a_{1:T},c).
$$

因此 action condition 不是只在 teacher 中存在，student 也在相同的首帧、动作轨迹和语言条件下学习 few-step 生成。

## Results

### WorldArena 2.0

论文报告的是 2026 年 8 月 12 日的固定 leaderboard snapshot，因此这些名次不是永久 leaderboard 结论。

- Track 1：DreamX-Phi-1.0-FDM-0730 的 EWMScore-P 为 **60.65**，在论文所用 snapshot 中排名第一。
- Track 2：在 Adjust Bottle 上成功率为 **67.19%**，与另一系统并列第二。
- Track 1 的物理一致性和 3D 相关指标也被纳入综合评分，而不只是图像质量。

### WorldArena 1.0

论文还给出离线 Track 1 结果：

- EWMScore-P：**76.88**
- Interaction Quality：**77.90**
- Trajectory Accuracy：**58.98**
- Depth Accuracy：**93.17**
- Perspectivity：**96.30**
- Instruction Following：**84.92**
- Semantic Alignment：**89.68**

这些数字说明它在综合评测上很强，但不能直接作为每个模块的独立因果证据，因为论文没有用完全匹配的消融把 PRoPE、flow、depth、mask 和 V-JEPA 的贡献分别拆开。

## What This Paper Actually Demonstrates

我认为论文最有价值的证据不是“拿到了排行榜第一”，而是它把 action-conditioned video model 的接口问题拆得比较清楚：

1. **动作结构不能只靠 generic embedding 表达。** 对双臂刚体轨迹，显式保留相对 $SE(3)$ 关系是有意义的 inductive bias。
2. **空间定位和物体响应是两件事。** PRoPE 约束手臂怎么动，mask 和 V-JEPA 约束动作后物体怎么演化。
3. **训练时的辅助监督可以不变成部署时的额外输入。** depth、SAM3 mask 和 teacher feature 都主要服务于训练。
4. **FDM 与 WAM 的边界需要保留。** DreamX-Phi 当前预测的是给定 action 下的 future observation，尚未联合生成 action。

## Limitations

- 当前实验主要集中在 WorldArena 和 RoboTwin，真实机器人闭环泛化仍未被充分验证。
- Track 2 只覆盖 Adjust Bottle，不能代表一般化的 world-model-based policy learning。
- leaderboard 分数是整套系统的结果，不能单独证明某一种 action injection 一定优于其他接口。
- 论文使用的是 externally prescribed action trajectory；模型并不判断这条轨迹是否可执行，也不生成自己的动作。
- 论文的 robot action representation 偏向刚体和运动学描述，对柔性、腱驱动、顺应性机构的表达有限。
- 深度、SAM3 和 V-JEPA 的监督都依赖额外模型或离线处理，数据管线成本并不低。
- video realism、trajectory following、object consistency 和 closed-loop success 之间仍然可能存在评价错位。

## Connection To World-Model Branches

DreamX-Phi 对组会上“模型应该如何关注 action 相关区域”的讨论提供了一个中间答案，也把 AC-WM 这条分支和 WAM 这条分支之间的边界画得更清楚：

- 它没有完全依赖人工抠图；
- 也没有把所有信息都交给模型自己从 RGB 中发现；
- 它使用结构化的 action geometry 和训练期 object-centric supervision，把关注点作为可学习接口和监督信号的一部分。

如果把 WAM 看成更偏 latent/action interface 的分支，DreamX-Phi 更像 AC-WM 的一篇代表: 它把外部 action 直接作为条件，强调 future observation 和 physical consistency 的建模。它仍然不是“完全让模型自己学会认知”，但比硬编码 crop 或简单渲染 mask 更接近可解释的结构化归纳偏置。真正值得验证的问题是：这些辅助通道是否能在不牺牲开放场景泛化的情况下，减少模型对人工 action-region preprocessing 的依赖。

## Related Entries

- [Fast-WAM](/paper-briefs/fast-wam-2603-16666/)
- [Faster-WAM / DoT](/paper-briefs/faster-wam-2608-02365/)
- [Being-H0.7](/paper-briefs/being-h07-2605-00078/)
- [AC-WM 主题综述](/surveys/ac-wm/)
- [WAM 主题综述](/surveys/wam/)
- [2026-08-20 组会讨论复盘](/notes/2026-08-20-action-conditioned-world-models/)

## Links

- [arXiv abstract](https://arxiv.org/abs/2608.13489)
- [arXiv HTML](https://arxiv.org/html/2608.13489)
- [Project repository](https://github.com/AMAP-ML/DreamX-Phi)
