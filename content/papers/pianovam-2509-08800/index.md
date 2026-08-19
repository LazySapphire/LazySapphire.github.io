---
title: "PianoVAM 论文阅读笔记"
list_title: "PianoVAM"
description: "用真实练琴场景采集视频、音频、MIDI、手部 landmark 和 fingering 标注，为钢琴转录提供多模态基准。"
date: "2026-08-19"
math: true
tags: ["music-information-retrieval", "dataset", "audio-visual", "piano-transcription", "fingering", "multimodal"]
categories: ["paper-notes"]
paper_title: "PianoVAM: A Multimodal Piano Performance Dataset"
authors: ["Yonghyun Kim", "Junhyung Park", "Joonhyung Bae", "Kirak Kim", "Taegyun Kwon", "Alexander Lerch", "Juhan Nam"]
year: 2025
venue: "ISMIR 2025"
arxiv: "2509.08800"
paper_url: "https://arxiv.org/abs/2509.08800"
project_url: "https://yonghyunk1m.github.io/PianoVAM/"
cover: "fig1_dataset_modalities.png"
cover_caption: "PianoVAM 把视频、音频、MIDI、hand landmarks、fingering 和 metadata 放进同一个练琴数据集。"
cover_source: "https://arxiv.org/abs/2509.08800"
cover_credit: "Kim et al., 2025"
---

论文: **PianoVAM: A Multimodal Piano Performance Dataset**
版本: arXiv:2509.08800v1, ISMIR 2025
链接: [arXiv](https://arxiv.org/abs/2509.08800), [Project](https://yonghyunk1m.github.io/PianoVAM/)

## 一句话结论

PianoVAM 不是机器人控制数据集，而是面向 MIR 的真实练琴多模态数据集: 重点是把视频、音频、MIDI、手部 landmark 和 fingering 放到一起，给钢琴转录和 audio-visual 学习提供更接近真实环境的基准。

{{< figure src="fig1_dataset_modalities.png" alt="PianoVAM modalities" caption="论文 Figure 1：同一段练琴同时有视频、音频、MIDI、hand landmarks、fingering 和 metadata。" >}}

## 它要解决什么

作者想补的是钢琴转录的“现实世界数据缺口”。

MAESTRO 这类数据集虽然干净，但主要是音频 + MIDI；而真实练琴场景里，视频、手势、姿态、踏板和噪声都很重要。很多 audio-visual transcription 方法在干净数据上已经接近天花板，下一步就要看真实、多模态、带干扰的数据。

## 数据集怎么来的

PianoVAM 来自 Disklavier 钢琴的真实练习录制，包含:

- 106 段 solo piano recordings
- 10 位业余演奏者
- 约 21 小时
- 38 位作曲家的曲目
- 1080p / 60fps top-view video
- 44.1 kHz mono audio
- MIDI
- hand landmarks
- fingering labels
- metadata

作者也明确说了，这批数据主要来自 DailyPractice，因此更像真实练习，不是舞台上“理想化”的演出。

{{< figure src="fig2_dataset_statistics.png" alt="PianoVAM dataset statistics" caption="论文 Figure 2：与 MAESTROv3 相比，PianoVAM 的 pedal 使用更重，pitch/velocity 分布则接近。" >}}

## fingering 是怎么标的

这篇的一个核心贡献是半自动 fingering annotation。

流程是:

1. 用 MediaPipe Hands 提取手部 landmark。
2. 用几何规则过滤 floating hand。
3. 为每个 note 计算候选 finger score。
4. 单候选直接接受，多候选由人工 GUI 复核。

这个思路比纯人工标注轻很多，也比单纯模型预测稳。

{{< figure src="fig3_fingering_detection_flow.png" alt="Fingering detection flow" caption="论文 Figure 3：半自动 fingering 标注流程。" >}}

## 标注质量和数据特性

作者手工检查了 10 首曲子的前 150 个 note，平均 precision 超过 95%。一些复杂片段会有多候选或无候选，但总体可用。

这说明 PianoVAM 的 fingering 不是“顺手画个标签”，而是确实经过规则筛选 + 人工修订的。

{{< figure src="table3_fingering_reliability.png" alt="Fingering reliability table" caption="论文 Table 3：fingering 候选的 precision 和无候选/多候选比例。" >}}

## benchmark 结果

作者做了两组 benchmark。

### 1. audio-only transcription

用 Onsets and Frames 在 PianoVAM、MAESTROv3 和 combined 数据上训练。结果显示 PianoVAM 在 Note 和 w/ Velocity 上能超过 MAESTROv3，说明真实练琴数据对某些 transcription 子任务更有帮助。

### 2. audio-visual transcription

作者把视频做成一个简单的后处理过滤器，用 hand landmarks 和 keyboard geometry 去删掉物理上不可能的 onset。结果表明，在 noisy 和 reverberant 条件下，视频能稳定提升 precision 和 F1。

{{< figure src="table4_transcription_benchmark.png" alt="Transcription benchmark" caption="论文 Table 4：PianoVAM 在音频转录上和 MAESTROv3 可比，联合训练时部分指标更好。" >}}

## 这篇和 RP1M / FürElise 的区别

这三篇都和 piano 有关，但目标不一样:

- RP1M: 机器人钢琴动作数据集，服务控制和 imitation learning。
- FürElise: 真实 3D 手部动作采集 + 物理合成。
- PianoVAM: 多模态 piano performance 数据集，服务 MIR / transcription。

PianoVAM 更像是“真实演奏研究的感知层底座”，而不是控制层底座。

## 我的判断

这篇的优点是务实:

- 采集流程真实。
- 模态齐全。
- fingering 标注不是纯手工硬堆。
- benchmark 直接围绕 transcription 和 audio-visual robustness。

缺点也很明显:

- 数据量不算大，只有 21 小时。
- 只来自 10 个业余演奏者，分布有偏。
- 更像一个高质量基准，而不是覆盖广泛风格的通用数据集。

但如果你的目标是做钢琴转录、音视频融合、fingering 推断，这篇很值得当作起点。
