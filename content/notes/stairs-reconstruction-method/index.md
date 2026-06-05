---
title: "阶梯数据重建技术报告"
list_title: "阶梯数据重建方法"
description: "记录将平地策略 rollout 重建为阶梯地形参考轨迹的数据结构、窗口调度、足部目标与全身 QP 求解方法。"
date: "2026-06-05"
math: true
tags: ["stairs", "data-reconstruction", "robotics"]
categories: ["notes"]
status: "current"
direction: "stairs / data_reconstruction"
---

状态: current  
方向: stairs / data_reconstruction

## 1. 报告范围

本文描述当前阶梯实验中“数据重建”部分的方法。这里的数据重建指：给定一段平地策略 rollout 和一张固定阶梯高度图，生成一段在阶梯地形上运动学可行、支撑语义尽量一致、且可用于后续策略训练监督的全身参考轨迹。

本文只介绍客观方法、数据结构、优化目标、参数和当前实验状态，不引用具体实现文件。

当前方法的核心特征是：

1. 地形统一表示为高度图，而不是显式台阶编号。
2. 输入参考来自平地策略 rollout，而不是手工动作或旧 retargeting 结果。
3. 重建按窗口增量提交，只把当前帧写入历史事实。
4. 足部阶段先确定双脚目标，随后全身阶段在机器人运动学约束下求解 root、下肢和腰部的 21 维局部速度增量。
5. 失败时保存 partial 结果、retry 统计和失败窗口快照。

## 2. 问题定义

设平地参考序列为

$$
\mathcal D^{flat}
{=}
\left\{
q_t^{ref},
X_t^{ref},
R_t^{ref},
c_t^{ref},
s_t^{ref},
a_{t,f}^{ref},
Q_{t,f}^{ref},
\Delta a_{t,f}^{ref},
\Delta c_t^{ref},
\sigma_t,
\omega_t,
d_{t,f,j}^{ref},
\rho_{t,f}^{ref}
\right\}_{t=0}^{T-1},
$$

其中：

1. \(q_t^{ref}\) 是 G1 全身 qpos。
2. \(X_t^{ref},R_t^{ref}\) 是全身 body 世界位置和姿态。
3. \(c_t^{ref}\) 是 COM。
4. \(s_t^{ref}\) 是参考支撑中心。
5. \(a_{t,f}^{ref}\) 是左右脚 ankle 世界位置，\(f\in\{L,R\}\)。
6. \(Q_{t,f}^{ref}\) 是左右脚 ankle/foot 世界姿态。
7. \(\Delta a_{t,f}^{ref}\)、\(\Delta c_t^{ref}\) 是参考一阶增量。
8. \(\sigma_t\) 是支撑相，取值为 none / left / right / double。
9. \(\omega_t=(\omega_{t,L},\omega_{t,R})\) 是连续支撑权重。
10. \(d_{t,f,j}^{ref}\) 是脚底 patch 点在平地参考中的 clearance。
11. \(\rho_{t,f}^{ref}\) 是脚底支撑区域语义，取值为 none / rear / fore / full。

地形表示为高度图查询函数：

$$
h:\mathbb R^2\rightarrow\mathbb R.
$$

目标是求解阶梯轨迹

$$
\mathcal D^{stairs}
{=}
\left\{
q_t^*,
X_t^*,
R_t^*,
c_t^*,
a_{t,f}^{target},
a_{t,f}^{actual},
\rho_{t,f}^*,
b_{t,f}^*
\right\}_{t=0}^{T'-1},
$$

其中 \(T'\le T\)，通常为丢弃尾部 future window 后的可提交帧数。\(a_{t,f}^{target}\) 是足部阶段给出的目标 ankle，\(a_{t,f}^{actual}\) 是全身阶段前向运动学得到的真实 ankle，\(b_{t,f}^*\) 是连续支撑段继承的 clearance bias。

当前重建不改变支撑相序列 \(\sigma_t\)，也不使用支撑相修复。

## 3. 地形与脚底几何

### 3.1 高度图

阶梯只通过高度图参与求解：

$$
z=h(x,y).
$$

高度图用于：

1. 足部阶段计算支撑脚与摆动脚高度目标。
2. 足部阶段评价 patch clearance、穿透和台面跨度。
3. 全身阶段为摆动脚约束提供最小离地高度。
4. 输出分析阶段统计 support / swing patch penetration。

全身阶段不使用显式台阶编号。它只间接接收足部阶段产生的 ankle 目标，并在摆动脚 clearance 约束中查询高度图。

### 3.2 脚底 patch

每只脚使用 5 个固定 patch 点：

$$
\mathcal P_f = \{o_{f,1},\ldots,o_{f,5}\}.
$$

其中 rear 区域由后部 2 个 patch 表示，fore 区域由前部 3 个 patch 表示，full 区域使用全部 5 个 patch。

给定 ankle 位置 \(a_{t,f}\) 与脚姿态 \(Q_{t,f}\)，第 \(j\) 个脚底点为

$$
p_{t,f,j}
{=}
a_{t,f}
+
Q_{t,f}o_{f,j}.
$$

其 clearance 定义为

$$
d_{t,f,j}
{=}
p_{t,f,j}^{z}
{-}
h(p_{t,f,j}^{xy}).
$$

穿透量定义为

$$
\pi_{t,f,j}
{=}
\max(-d_{t,f,j},0).
$$

对于支撑区域 \(r\in\{\text{rear},\text{fore},\text{full}\}\)，代表点为对应 patch offset 的均值：

$$
o_{f}^{r,rep}
{=}
\frac{1}{|\mathcal P_r|}
\sum_{j\in\mathcal P_r}o_{f,j}.
$$

代表点位置为

$$
p_{t,f}^{r,rep}
{=}
a_{t,f}
+
Q_{t,f}o_{f}^{r,rep}.
$$

## 4. 全量数据结构与增量数据结构

### 4.1 全量输入数据

输入平地 rollout 是全量数组，长度为 \(T\)。它保存：

1. 全身 qpos。
2. 全身 body 世界位置和姿态。
3. COM。
4. 支撑中心。
5. 支撑相和支撑权重。
6. 左右 ankle 位置与姿态。
7. ankle 与 COM 的一阶增量。
8. 脚底 patch clearance。
9. 脚底区域语义。
10. motion time step 和 joint name。

这些数据在重建过程中作为参考场，整个序列均可读。

### 4.2 对齐后的全量参考

对齐阶段生成一份新的全量参考：

$$
\tilde{\mathcal D}^{ref}
{=}
\operatorname{Align}(\mathcal D^{flat};\psi,\Delta).
$$

它与输入 rollout 等长，保存旋转和平移后的 qpos、body、COM、support center、ankle、增量和姿态。对齐后的参考只用于提供目标语义，不代表已经适配地形。

### 4.3 增量提交缓存

重建结果不一次性全局求解，而是使用增量提交缓存：

$$
\mathcal C_k
{=}
\left\{
q_i^*,
a_{i,f}^{target},
a_{i,f}^{actual},
Q_{i,f}^{actual},
c_i^*,
X_i^*,
R_i^*,
\rho_{i,f}^*,
b_{i,f}^*,
m_i^{perf}
\right\}_{i=0}^{k-1}.
$$

这里 \(k\) 是已经提交的帧数。窗口中的 future 帧可参与当前窗口求解，但不会作为历史事实传播到下一个窗口。下一窗口只读取已经提交的 current 帧结果，尤其是全身阶段前向运动学得到的真实 ankle，而不是足部阶段的临时 target。

### 4.4 诊断增量数据

每次提交当前帧时，同时追加足部阶段诊断量：

1. 支撑代表点 clearance error。
2. 支撑 patch penetration。
3. 摆动 patch penetration。
4. 足部 \(xy\) 修正量。
5. none-support 预算使用量。
6. 支撑 clearance bias。
7. landing full-span。
8. landing pair distance delta。
9. landing support region。

这些诊断数据是按提交帧增量追加的，不是对 future 解做全量统计。

## 5. 参考对齐阶段

### 5.1 yaw 对齐

给定目标 yaw \(\psi^{target}\) 和参考帧 \(t_0\)，先从参考 root 姿态提取初始 yaw：

$$
\psi^{ref}=\operatorname{Yaw}(q_{t_0}^{ref}).
$$

对齐 yaw 为

$$
\Delta\psi
{=}
\psi^{target}
{-}
\psi^{ref}.
$$

所有世界位置使用 \(R_z(\Delta\psi)\) 旋转；所有世界姿态使用同一 yaw quaternion 左乘；所有平移增量也用同一旋转变换。

### 5.2 anchor 对齐

设旋转后序列中的支撑中心和左右 ankle 点集为

$$
\mathcal X
{=}
\{\tilde s_t^{ref},\tilde a_{t,L}^{ref},\tilde a_{t,R}^{ref}\}_{t=0}^{T-1}.
$$

当前使用整段水平分布中心：

$$
c_{\mathcal X}^{xy}
{=}
\frac{1}{2}
\left(
\min_{x\in\mathcal X}x^{xy}
+
\max_{x\in\mathcal X}x^{xy}
\right).
$$

给定目标 anchor \(a^{anchor}\)，平移量为

$$
\Delta^{xy}
{=}
a^{anchor}
{-}
c_{\mathcal X}^{xy}.
$$

该平移应用到 root、body、COM、support center 和 ankle 的世界位置。

### 5.3 phase anchor

批量采集时，每个 phase 的 anchor 沿阶梯前进方向平移：

$$
a_k^{anchor}
{=}
c_{terrain}^{xy}
+
\begin{bmatrix}
kD/N\\
0
\end{bmatrix},
\qquad
k\in\{0,\ldots,N-1\},
$$

其中 \(D\) 是 step depth，\(N=3\) 是当前 phase 数。

默认 yaw 集合为：

$$
\{0^\circ,45^\circ,90^\circ,135^\circ,180^\circ,225^\circ,270^\circ,315^\circ\}.
$$

## 6. 窗口调度

当前使用局部窗口：

$$
W_t
{=}
[t-H,\ldots,t-1\mid t\mid t+1,\ldots,t+F],
$$

其中：

$$
H=2,\qquad F=5.
$$

窗口被分为三段：

1. history: 已提交历史帧，只读。
2. current: 当前要提交的帧。
3. future: 只参与当前局部优化，不提交。

前两帧使用 bootstrap 窗口：

$$
W_0=[0],
\qquad
W_1=[0,1].
$$

标准窗口从 \(t=H\) 开始。若尾部不足 \(F\) 个 future 帧，则不再构造窗口。因此可提交长度为由窗口集合定义的 \(T'\)，而不是完整 \(T\)。在当前默认 5 future 设置下，尾部通常丢弃 5 帧。

## 7. 足部阶段

### 7.1 目标

足部阶段为每个窗口内的左右脚生成 ankle 目标：

$$
a_{\tau,f}^{target}
\in
\mathbb R^3,
\qquad
Q_{\tau,f}^{target}.
$$

默认情况下，脚姿态来自对齐后的参考姿态：

$$
Q_{\tau,f}^{target}
{=}
\tilde Q_{\tau,f}^{ref}.
$$

只有在特定 retry 中，支撑脚姿态会允许一个小的世界系 rotvec 偏移。该偏移属于求解失败时的局部重试策略，不属于常规语义修复。

### 7.2 平面初值递推

对每只脚 \(f\)，先构造 \(xy\) 初值。

若当前帧与上一帧均为该脚支撑态：

$$
P_{xy}a_{\tau,f}^{(0)}
{=}
P_{xy}a_{\tau-1,f}^{commit}.
$$

否则保留参考一阶增量：

$$
P_{xy}a_{\tau,f}^{(0)}
{=}
P_{xy}a_{\tau-1,f}^{commit}
+
P_{xy}
\left(
\tilde a_{\tau,f}^{ref}
{-}
\tilde a_{\tau-1,f}^{ref}
\right).
$$

这里的 \(a_{\tau-1,f}^{commit}\) 来自已经提交的全身 FK 结果。

### 7.3 支撑脚高度闭合

若脚 \(f\) 在帧 \(\tau\) 是支撑脚，并选择支撑区域 \(r\)，则 ankle 高度由代表点参考 clearance 闭合：

$$
p_{\tau,f}^{r,rep,z}
{-}
h(p_{\tau,f}^{r,rep,xy})
\approx
d_{\tau,f}^{r,ref}
+
b_{\tau,f}.
$$

其中 \(b_{\tau,f}\) 是连续支撑段继承的 clearance bias。该 bias 用于维持同一支撑段内高度语义连续，而不是改变支撑相。

### 7.4 摆动脚高度映射

摆动脚不绑定支撑区域，使用 full representative clearance。设当前脚 candidate 所在地形相对另一只脚 anchor 地形的高度差为

$$
\Delta h
{=}
h(a_{\tau,f}^{xy})
{-}
h(a_{\tau,\bar f}^{xy}).
$$

设平地参考 clearance 为 \(d^{ref}\)，使用平滑映射：

$$
H
{=}
\max(3|\Delta h|,\epsilon),
$$

$$
\eta
{=}
\operatorname{clip}
\left(
\frac{d^{ref}}{H+\frac{1}{2}\Delta h},
0,
1
\right),
$$

$$
\phi(\eta)=3\eta^2-2\eta^3,
$$

$$
d^{target}
{=}
d^{ref}
{-}
\Delta h\cdot\phi(\eta).
$$

随后 ankle 高度由

$$
p_{\tau,f}^{full,rep,z}
{-}
h(p_{\tau,f}^{full,rep,xy})
{=}
d^{target}
$$

闭合。

该映射的目的不是让摆动脚追踪某个台阶编号，而是在高度突变附近平滑降低或提高相对 clearance 需求，减少非支撑脚相对地形的突变。

### 7.5 patch clearance 下界

足部阶段最终还会对所有候选施加 patch clearance 下界：

$$
a_{\tau,f}^{z}
\ge
\max_j
\left[
h
\left(
a_{\tau,f}^{xy}
+
(Q_{\tau,f}o_{f,j})^{xy}
\right)
+
d_{floor}
{-}
(Q_{\tau,f}o_{f,j})^{z}
\right].
$$

当前 support 与 swing 的默认 \(d_{floor}\) 均为：

$$
5\times10^{-4}\text{ m}.
$$

### 7.6 候选搜索

足部阶段采用离散 \(xy\) 搜索和解析 \(z\) 闭合。对每个候选 \(xy\)，计算对应 ankle \(z\)、patch clearance 和综合代价。

当前搜索集合：

1. 常规自由脚搜索：

$$
\{-0.03,-0.015,0,0.015,0.03\}\text{ m}.
$$

2. 新落脚支撑帧搜索：

$$
\{-0.06,-0.045,-0.03,-0.015,0,0.015,0.03,0.045,0.06\}\text{ m}.
$$

3. none-support 搜索：

$$
\{-0.02,-0.01,0,0.01,0.02\}\text{ m}.
$$

none-support 还施加盒约束：

$$
\left\|
P_{xy}
\left(
a_{\tau,f}^{target}
{-}
a_{\tau,f}^{(0)}
\right)
\right\|_\infty
\le
0.02\text{ m}.
$$

连续支撑帧不进行 \(xy\) 搜索，其 \(xy\) 继承已建立的支撑位置。

### 7.7 支撑区域选择与连续支撑

新落脚帧会在 rear / fore / full 中选择支撑区域。连续支撑帧优先继承上一帧区域。

若继承区域出现明显低质量，则允许在不改变支撑相的前提下切换区域。低质量判据包括：

$$
\max_j\pi_{t,f,j}>0.005\text{ m}
$$

或区域内部 clearance span 超过

$$
0.04\text{ m}.
$$

区域切换还要求候选区域的代价至少优于当前区域一个 margin：

$$
E_{alt}+0.02<E_{current}.
$$

### 7.8 足部代价

足部阶段的候选代价可写为：

$$
E_{foot}
{=}
E_{xy-ref}
+
E_{inc}
+
E_{acc}
+
E_{support}
+
E_{swing}
+
E_{none}
+
E_{landing}.
$$

其中基础项为：

$$
E_{xy-ref}
{=}
w_{xy-ref}
\left\|
P_{xy}(a-a^{(0)})
\right\|_2^2,
$$

$$
E_{inc}
{=}
w_{xy-inc}
\left\|
P_{xy}
\left(
(a_\tau-a_{\tau-1})
{-}
\Delta a_\tau^{ref}
\right)
\right\|_2^2
+
w_{z-inc}
\left(
\Delta a_\tau^z
{-}
\Delta a_\tau^{ref,z}
\right)^2,
$$

$$
E_{acc}
{=}
w_{xy-acc}
\left\|
P_{xy}
\left(
a_\tau-2a_{\tau-1}+a_{\tau-2}
\right)
\right\|_2^2.
$$

支撑脚项为：

$$
E_{support}
{=}
w_{rep}
\left(
d^{rep}-d^{rep,ref}-b
\right)^2
+
w_{support-pen}
\sum_j\pi_j^2
+
w_{span}
\left(
\max_{j\in r}d_j-\min_{j\in r}d_j
\right)^2.
$$

摆动脚项为：

$$
E_{swing}
{=}
w_{swing-h}
\left(
d^{full}-d^{ref}
\right)^2
+
w_{swing-pen}
\sum_j
\max(-(d_j-d_{slack}),0)^2.
$$

none-support 额外使用：

$$
E_{none}
{=}
w_{none-pen}
\sum_j\pi_j^2.
$$

新落脚帧额外使用 full-span：

$$
E_{full-span}
{=}
w_{full-span}
\left(
\max_j d_j-\min_j d_j
\right)^2.
$$

并使用双脚距离偏置。设

$$
\Delta \ell
{=}
\|a_{\tau,L}^{xy}-a_{\tau,R}^{xy}\|_2
{-}
\|\tilde a_{\tau,L}^{ref,xy}-\tilde a_{\tau,R}^{ref,xy}\|_2.
$$

当参考双脚距离大于 \(0.4\text{ m}\) 时，扩张比收缩受到更强惩罚：

$$
E_{pair}
{=}
w_{expand}\max(\Delta\ell,0)^2
+
w_{shrink}\max(-\Delta\ell,0)^2.
$$

当参考双脚距离不大于 \(0.4\text{ m}\) 时，权重方向相反，以避免双脚被压得过近。

### 7.9 足部阶段默认参数

当前默认权重和阈值如下：

```text
xy_reference_weight = 1.0
xy_increment_weight = 8.0
xy_acceleration_weight = 2.0
z_increment_weight = 3.0
support_rep_clearance_weight = 30.0
support_penetration_weight = 80.0
support_span_weight = 4.0
landing_full_span_weight = 40.0
landing_pair_expand_weight = 3.0
landing_pair_shrink_weight = 1.0
landing_pair_distance_threshold = 0.4 m
landing_pair_window_bias_scale = 1.2
swing_height_weight = 12.0
swing_penetration_weight = 45.0
none_support_penetration_weight = 60.0
nonlinear_height_threshold_scale = 3.0
outer_iterations = 3
```

## 8. 完美帧筛选

足部阶段输出后会生成完美帧掩码：

$$
m_t^{perf}\in\{0,1\}.
$$

当前判据为：

1. 不在支撑相切换前后 1 帧内。
2. 支撑 patch 最大穿透不超过 \(0.003\text{ m}\)。
3. 支撑代表点 clearance error 不超过 \(0.01\text{ m}\)。
4. 摆动 patch 最大穿透不超过 \(0.003\text{ m}\)。
5. 足部 \(xy\) 修正量不超过 \(0.015\text{ m}\)。

完美帧不把足部绝对位置强行复制到全身阶段。其作用是在全身阶段提高下半身 joint prior 权重。

## 9. 全身阶段

### 9.1 变量

全身阶段每个待优化帧使用 21 维速度增量变量：

$$
\delta v_\tau\in\mathbb R^{21}.
$$

变量组成：

1. root 平移 3 维。
2. root 局部旋转 3 维。
3. 双腿与腰部 15 个铰链关节。

双臂不参与优化，始终保持参考 qpos：

$$
q_{\tau}^{arm}=q_{\tau}^{arm,ref}.
$$

状态更新使用 MuJoCo 位姿积分语义：

$$
q_\tau^{new}
{=}
\operatorname{IntegratePos}(q_\tau,\delta v_\tau).
$$

### 9.2 迭代线性化 QP

全身阶段采用多轮线性化二次规划。每一轮在当前 \(q_\tau\) 上线性化：

1. 左右 ankle 位置。
2. 左右 ankle 姿态。
3. torso 姿态。
4. COM。
5. 若干下肢与 torso body 间的结构向量。

线性化形式为：

$$
y(q+\delta v)
\approx
y(q)+J_y(q)\delta v.
$$

QP 可概括为：

$$
\min_{\delta}
\sum_i
w_i
\|A_i\delta-b_i\|_2^2
$$

subject to

$$
l\le A_c\delta\le u.
$$

当前 OSQP 求解容差为：

$$
\epsilon_{abs}=\epsilon_{rel}=10^{-5},
$$

最大迭代次数为 \(100000\)，并启用 warm start。

### 9.3 硬约束

#### 9.3.1 支撑脚位置

若脚 \(f\) 在帧 \(\tau\) 为支撑脚，则约束：

$$
p_{\tau,f}^{ankle}(q)
{=}
a_{\tau,f}^{target}.
$$

线性化后为：

$$
J_{p,\tau,f}\delta v_\tau
{=}
a_{\tau,f}^{target}
{-}
p_{\tau,f}^{ankle}(q_\tau).
$$

默认容差：

$$
10^{-5}\text{ m}.
$$

#### 9.3.2 ankle 姿态

左右脚姿态均约束到足部阶段目标姿态：

$$
R_{\tau,f}^{ankle}(q)
{=}
Q_{\tau,f}^{target}.
$$

误差用世界系旋转向量表示：

$$
e_R
{=}
\operatorname{Log}
\left(
Q_{\tau,f}^{target}
\otimes
R_{\tau,f}^{ankle}(q)^{-1}
\right).
$$

线性化约束：

$$
J_{\omega,\tau,f}\delta v_\tau
{=}
e_R.
$$

默认容差：

$$
10^{-5}\text{ rad}.
$$

#### 9.3.3 torso 姿态

torso 姿态约束到对齐后的参考：

$$
R_\tau^{torso}(q)
{=}
\tilde R_\tau^{torso,ref}.
$$

默认容差同为：

$$
10^{-5}\text{ rad}.
$$

#### 9.3.4 变量盒约束与关节限位

每帧变量满足盒约束：

$$
\delta r^{xyz}\in[-0.2,0.2]^3,
$$

$$
\delta r^{rot}\in[-0.4,0.4]^3,
$$

$$
\delta q^{joint}\in[-0.9,0.9],
$$

并同时满足机器人 URDF/MuJoCo joint range。

### 9.4 摆动脚约束

非支撑脚不使用等式位置约束，而使用预算盒约束：

$$
p_{\tau,f}^{ankle}(q)
{-}
a_{\tau,f}^{target}
\in
[-B_x,B_x]\times[-B_y,B_y]\times[-B_z,B_z].
$$

默认：

$$
B_x=B_y=B_z=0.05\text{ m}.
$$

同时加入软跟随目标：

$$
E_{swing}
{=}
w_{swing}
\left\|
p_{\tau,f}^{ankle}(q)
{-}
a_{\tau,f}^{target}
\right\|_2^2,
\qquad
w_{swing}=10.
$$

摆动脚还必须满足 patch clearance 下界。令当前 ankle 位置为 \(p\)，目标 ankle 的 \(xy\) 为 \(a^{target,xy}\)，则最小 \(z\) 增量为：

$$
\Delta z_{min}
{=}
\max_j
\left[
h
\left(
a^{target,xy}
+
(Q_{\tau,f}^{target}o_{f,j})^{xy}
\right)
+
5\times10^{-4}
{-}
(Q_{\tau,f}^{target}o_{f,j})^z
\right]
{-}
p^z.
$$

QP 中会把摆动脚位置约束的 \(z\) 下界抬高到该值。

### 9.5 软目标

#### 9.5.1 root seed follow

root 平移增量被轻微惩罚：

$$
E_{root}
{=}
0.2
\|\delta r^{xyz}\|_2^2.
$$

#### 9.5.2 下半身 joint prior

下半身与腰部关节保持参考：

$$
E_{joint}
{=}
1.5
\|q^{joint}-\tilde q^{joint,ref}\|_2^2.
$$

若当前帧为完美帧，额外增加：

$$
E_{perfect}
{=}
12.0
\|q^{joint}-\tilde q^{joint,ref}\|_2^2.
$$

#### 9.5.3 COM 相对支撑

支撑目标中心为：

$$
s_\tau^*
{=}
\omega_{\tau,L}a_{\tau,L}^{target}
+
\omega_{\tau,R}a_{\tau,R}^{target}.
$$

COM 相对支撑目标保持参考相对关系：

$$
E_{com-rel}
{=}
16.0
\left\|
\left(
c_\tau(q)-s_\tau^*
\right)
{-}
\left(
\tilde c_\tau^{ref}-\tilde s_\tau^{ref}
\right)
\right\|_2^2.
$$

#### 9.5.4 COM 增量

$$
E_{com-inc}
{=}
8.0
\left\|
\left(
c_\tau(q)-c_{\tau-1}(q)
\right)
{-}
\Delta c_\tau^{ref}
\right\|_2^2.
$$

#### 9.5.5 qpos 增量与加速度

定义时序跟踪向量：

$$
y_\tau
{=}
\begin{bmatrix}
r_\tau^{xyz}\\
q_\tau^{leg+waist}
\end{bmatrix}.
$$

这里不包含 root quaternion，也不包含双臂。

一阶增量项：

$$
E_{q-inc}
{=}
4.0
\left\|
\left(
y_\tau-y_{\tau-1}
\right)
{-}
\left(
\tilde y_\tau^{ref}-\tilde y_{\tau-1}^{ref}
\right)
\right\|_2^2.
$$

二阶差分项：

$$
E_{q-acc}
{=}
1.0
\left\|
\left(
y_\tau-2y_{\tau-1}+y_{\tau-2}
\right)
{-}
\left(
\tilde y_\tau^{ref}
-2\tilde y_{\tau-1}^{ref}
+\tilde y_{\tau-2}^{ref}
\right)
\right\|_2^2.
$$

尾窗跨度项：

$$
E_{tail}
{=}
2.0
\left\|
\left(
y_{last}-y_{current}
\right)
{-}
\left(
\tilde y_{last}^{ref}
-\tilde y_{current}^{ref}
\right)
\right\|_2^2.
$$

#### 9.5.6 结构保持

对 pelvis、双腿链条和 torso 的若干相邻 body 对，保持参考结构向量：

$$
E_{lap}
{=}
6.0
\sum_{(i,j)\in\mathcal E}
\left\|
\left(
x_i(q)-x_j(q)
\right)
{-}
\left(
\tilde x_i^{ref}
-\tilde x_j^{ref}
\right)
\right\|_2^2.
$$

### 9.6 全身阶段默认参数

```text
outer_iterations = 4
swing_foot_clearance_extra_iterations = 2
root_seed_follow_weight = 0.2
joint_prior_weight = 1.5
perfect_frame_weight = 12.0
swing_foot_weight = 10.0
swing_foot_budget = 0.05 m
swing_foot_xy_budget = 0.05 m
swing_foot_budget_retry_scale = 1.2
com_relative_weight = 16.0
com_increment_weight = 8.0
q_increment_weight = 4.0
q_acceleration_weight = 1.0
q_tail_weight = 2.0
laplacian_weight = 6.0
foot_position_constraint_tolerance = 1.0e-5 m
orientation_constraint_tolerance = 1.0e-5 rad
joint_step_bound = 0.9
root_xyz_step_bound = 0.2 m
root_rot_step_bound = 0.4
```

## 10. Retry 机制

### 10.1 触发条件

当全身阶段 QP 失败时，当前窗口进入 retry。失败重试不改变原始支撑相，不做支撑相修复。

### 10.2 缩短 future window

首先缩短 future 长度，从当前 \(F-1\) 逐步尝试到最小 future：

$$
F-1,F-2,\ldots,F_{min}.
$$

当前

$$
F_{min}=0.
$$

缩短窗口的目的，是减少未来帧对当前帧的耦合压力。

### 10.3 落脚 pair 更近 bias

如果 retry 窗口中包含落脚帧，则启用“落脚 pair 更近”偏置。常规窗口 bias scale 为 1.2；失败 retry 中还会使用全身 retry scale 1.2 进一步调整：

$$
w_{expand}\leftarrow w_{expand}\cdot scale,
$$

$$
w_{shrink}\leftarrow w_{shrink}/scale.
$$

在首轮失败 retry 中，常见有效值为：

$$
w_{expand}=4.32,
\qquad
w_{shrink}\approx0.694.
$$

该机制不要求当前帧就是落脚帧；只要未来窗口中包含落脚帧，就允许通过时序优化把影响传递回当前帧。

### 10.4 动态摆动脚预算

retry 中启用动态摆动脚预算。设双脚目标水平距离为 \(\ell\)，step depth 为 \(D\)，step height 为 \(H_s\)，则

$$
r=\ell/D.
$$

若

$$
r<0.5,
$$

则

$$
B_{dyn}=H_s/3.
$$

否则

$$
B_{dyn}=r\cdot\frac{2H_s}{3}.
$$

最终乘以 retry scale，当前为 1.2：

$$
B_{retry}=1.2B_{dyn}.
$$

### 10.5 root 朝低脚方向的动态许可

retry 中允许 root 盒约束朝低脚方向扩展。设低脚目标为 \(a_{low}\)，当前 root seed 为 \(r\)，方向为

$$
u
{=}
\frac{a_{low}-r}{\|a_{low}-r\|}.
$$

扩展量为

$$
\Delta r_{extra}
{=}
uB_{retry}.
$$

root 盒约束只在该方向上扩展：

$$
l_{root}
{=}
[-B,-B,-B]+\min(\Delta r_{extra},0),
$$

$$
u_{root}
{=}
[B,B,B]+\max(\Delta r_{extra},0).
$$

基础 \(B=0.2\text{ m}\)。

### 10.6 姿态容差 retry

retry 尝试顺序包括：

1. strict retry。
2. 低脚 ankle 小容差。
3. 高脚 ankle 小容差。
4. root step bound 放大。
5. joint step bound 放大。
6. 双 ankle 容差序列。
7. 双 ankle + torso 小容差组合。
8. root step 放大 + ankle/torso 容差组合。
9. joint step 放大 + ankle 小容差组合。

默认 ankle 小容差：

$$
5\times10^{-4}\text{ rad}.
$$

relaxed ankle 容差序列：

$$
0.002,\;0.005,\;0.01,\;0.02,\;0.03,\;0.05,\;0.075\text{ rad}.
$$

torso retry 容差序列：

$$
0.001,\;0.002,\;0.005\text{ rad}.
$$

root step retry scale：

$$
1.5,\;2.0.
$$

joint step retry scale：

$$
1.2,\;1.5.
$$

### 10.7 脚部姿态 retry

如果全身阶段姿态容差 retry 全部失败，且当前双脚目标高度存在显著差异，则尝试在足部阶段对支撑脚目标姿态施加小 rotvec 偏移，然后重新运行足部阶段和全身阶段。

默认角度集合：

$$
0.006,\;0.012,\;0.02\text{ rad}.
$$

方向集合由坐标轴及其组合方向构成。尝试顺序优先低脚，再尝试高脚。

该机制仍不改变支撑相；它只是在失败窗口内微调支撑脚姿态目标。

### 10.8 Retry 记录

每次 retry 会记录：

1. 当前全局帧。
2. 原始窗口帧。
3. 每个 shrink future 的窗口帧。
4. landing pair bias 是否启用。
5. 动态 swing/root-low-foot 预算。
6. 每个 orientation attempt 的标签、容差和结果。
7. 若失败，记录失败异常。

这些信息进入 `retry_summary` 和 `retry_events`，用于事后统计哪些帧发生过哪些 retry。

## 11. 失败快照与恢复

### 11.1 失败快照

当窗口失败且所有 retry 均失败时，系统保存失败窗口快照。当前保留失败窗口前最多 10 个历史窗口。

快照包含：

1. 窗口 global indices。
2. history/current/future 划分。
3. 对齐参考窗口。
4. 支撑相、支撑权重、patch clearance、region state。
5. 已提交 prefix 的 qpos、target ankle、actual ankle、COM、body pose、support region、clearance bias、perfect mask。
6. 已提交足部诊断。
7. 失败窗口的足部阶段结果。
8. 当前配置、地形元数据和异常信息。

### 11.2 partial 输出

失败时仍保存：

1. 对齐后的原参考轨迹。
2. 已提交的重建轨迹。
3. 元数据。
4. 分析统计。
5. viewer 指令。
6. retry summary。
7. failure snapshot manifest。

输出状态标记为：

$$
status=\text{partial\_failure}.
$$

### 11.3 从快照恢复

恢复时读取快照中的 committed prefix，并可选择回退若干帧：

$$
k_{restore}
{=}
\max(t_{snapshot}-R,0),
$$

其中 \(R\) 是 rollback frames。当前人工诊断建议常用：

$$
R=5.
$$

恢复后从指定窗口重新执行足部阶段和全身阶段。恢复不会修改快照之前已提交数据的语义，只是将提交游标回退后重新求解后续帧。

## 12. 输出与分析

### 12.1 输出轨迹

每次重建保存两条轨迹：

1. 对齐后的原参考轨迹。
2. 阶梯地形重建轨迹。

重建轨迹额外包含：

1. 支撑相。
2. 支撑权重。
3. 选定支撑区域。
4. 支撑 clearance bias。
5. 足部 target ankle。
6. 实际 ankle。
7. COM。
8. 全身 body pose。

### 12.2 元数据

元数据包含：

1. 输入 rollout 与 heightmap。
2. robot XML / URDF。
3. yaw 和 anchor 对齐信息。
4. 窗口参数与提交帧数。
5. 地形参数。
6. viewer 指令。
7. 分析摘要。
8. retry summary。
9. retry events。
10. failure snapshots。
11. partial failure 信息或 resume 信息。

### 12.3 分析指标

当前分析指标包括：

1. 支撑 patch penetration。
2. 摆动 patch penetration。
3. 支撑代表点 clearance error。
4. bias-aware 支撑代表点 clearance error。
5. COM 相对支撑误差。
6. 支撑中心目标误差。
7. 支撑脚 target 跟随误差。
8. 摆动脚 target 跟随误差。
9. ankle 增量误差。
10. root 增量误差。
11. root 二阶差分抖动。
12. ankle 二阶差分抖动。
13. 下半身 joint 偏离。
14. 完美帧比例。
15. 足部阶段 support / swing penetration。
16. 足部阶段 \(xy\) 修正量。
17. none-support 预算使用量。
18. landing full-span。
19. landing pair distance delta。
20. landing region 计数。
21. 连续支撑段 target / actual z step。
22. 连续支撑段 region switch 计数。

## 13. 批量采集方式

当前批量采集不是并行化单条轨迹内部窗口求解，而是并行运行不同 yaw/phase 轨迹。原因是单条轨迹的窗口求解依赖已提交历史，天然存在时序依赖。

默认批量配置：

```text
yaw_count = 8
phase_count = 3
total_jobs = 24
num_workers = 16
skip_completed = true
```

每个 worker 使用单线程 BLAS/OpenMP 环境，避免多进程下线程过度竞争。

每条 job 独立输出日志，父进程只汇总 queued / done / failed 状态。

## 14. 当前批量实验状态

最近一次 24 条数据采集结果为：

```text
completed = 13
partial_failure = 11
```

完整成功 yaw：

```text
0 deg
45 deg
90 deg
180 deg
```

部分成功 yaw：

```text
225 deg: phase1 completed; phase0 / phase2 failed
```

全失败 yaw：

```text
135 deg
270 deg
315 deg
```

失败帧：

```text
135 deg phase0: 1170
135 deg phase1: 4487
135 deg phase2: 4487
225 deg phase0: 4410
225 deg phase2: 4410
270 deg phase0: 934
270 deg phase1: 934
270 deg phase2: 436
315 deg phase0: 308
315 deg phase1: 1088
315 deg phase2: 437
```

完成条目中仍需复查的输出质量：

1. support patch 最大穿地超过 20 mm 的完成条目为 45 deg phase0，约 28.6 mm。
2. swing patch 最大穿地超过 20 mm 的完成条目较多，最大约 66.7 mm。

这些穿地统计来自事后分析指标，不表示求解约束被显式放宽。后续需要结合 viewer 和高度图局部查询确认其物理意义。

## 15. 当前方法边界

当前方法明确不做以下操作：

1. 不进行支撑相修复。
2. 不根据失败自动改变原始支撑语义。
3. 不使用显式台阶编号作为优化变量或约束条件。
4. 不把 future 解作为下一窗口历史事实。
5. 不对双臂做优化。

当前方法的工程近似包括：

1. 足部阶段是离散 \(xy\) 搜索和解析高度闭合，不是全局连续非线性优化。
2. 全身阶段是逐轮线性化 QP，不是完整非线性规划。
3. 完美帧是规则筛选，不是概率模型。
4. landing pair 更近 bias 是启发式局部代价，而不是物理稳定性充分条件。
5. 高度图在台阶边缘可能包含平滑过渡，viewer 中的碰撞体台阶和优化中的高度图局部语义可能不完全一致。

## 16. 当前判断

当前数据重建方法已经能稳定完成部分 yaw 方向，且失败时能够保存足够的 partial 结果、retry 统计和快照用于诊断。失败主要集中在特定方向和特定帧段，尤其是高低脚相差两级台阶、脚接近台阶边缘、或早期窗口运动学可行域不足的情况。

下一阶段不应直接继续全局放宽约束，而应优先对失败 yaw 的局部窗口进行诊断，区分以下原因：

1. 足部阶段目标已经不合理。
2. 高度图边缘平滑导致支撑语义混乱。
3. 全身阶段姿态硬约束与 root / joint step bound 冲突。
4. 摆动脚 clearance 约束或 patch 统计在局部过强。
5. 原参考动作本身在该 yaw 下对阶梯几何不友好。

在明确失败类别后，再决定是调整足部落脚代价、局部姿态 retry、root 动态预算，还是对特定 yaw 的数据采集策略做更细分处理。
