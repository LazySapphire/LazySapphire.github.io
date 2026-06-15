# 新工作电脑上的论文笔记维护指南

这份文档面向新的维护机器，说明如何克隆本仓库、初始化论文 PDF 资产工作区、发布新的论文阅读笔记，以及后续如何持续维护。

## 目标

当前仓库将“网页源码”和“论文 PDF 原文”分开维护：

- 主仓库 `LazySapphire.github.io` 保存 Hugo 源码、论文笔记、图片、脚本和维护记录。
- 资产仓库 `LazySapphire/pdf-archive` 保存论文 PDF 原文，并由 Git LFS 管理。

这样做的结果是：

- 新机器不需要默认下载全部 PDF。
- 只有在你点名需要某篇论文时，才会按需拉取那一篇 PDF。
- 网页本身不提供 PDF 下载入口，PDF 只用于本地维护和校对。

## 首次初始化

### 1. 安装基础工具

新机器至少需要：

- `git`
- `git-lfs`
- `python3`
- `hugo`

其中：

- `git-lfs` 用于维护 `pdf-archive` 仓库中的 PDF 文件。
- `hugo` 用于本地预览和构建网页。

### 2. 配置 GitHub SSH

`pdf-archive` 的远端地址固定为：

```bash
git@github.com:LazySapphire/pdf-archive.git
```

因此新机器需要先完成 GitHub SSH 配置，并确保下面的命令可以通过：

```bash
ssh -T git@github.com
```

预期会看到认证成功提示。

### 3. 克隆主仓库

建议直接使用 SSH 克隆：

```bash
git clone git@github.com:LazySapphire/LazySapphire.github.io.git
cd LazySapphire.github.io
```

### 4. 初始化 Git LFS

在主仓库目录下执行：

```bash
git lfs install
```

### 5. 初始化 PDF 资产工作区

执行：

```bash
scripts/bootstrap-pdf-archive.sh
```

执行后会在主仓库旁边生成一个本地工作区：

```text
../pdf-archive
```

这个工作区是：

- 浅克隆
- 默认跳过 LFS 自动下载

所以它只会拉取资产仓库的 Git 元数据和 LFS 指针文件，不会把全部历史 PDF 下载到本机。

## 初始化完成后的目录关系

常见目录结构如下：

```text
workspace/
├── LazySapphire.github.io/
└── pdf-archive/
```

其中：

- `LazySapphire.github.io/` 是网页主仓库
- `pdf-archive/` 是论文 PDF 资产工作区

## 日常开始维护前

每次开始维护前，建议先同步主仓库：

```bash
git pull --ff-only
```

如果这次工作涉及新增、替换或检查 PDF 原文，也同步资产仓库：

```bash
git -C ../pdf-archive pull --ff-only
```

## 新增一篇论文阅读笔记

假设这篇论文的 slug 是：

```text
example-2501-12345
```

推荐按下面顺序操作。

### 1. 先把 PDF 放进资产仓库

将新的论文 PDF 复制到：

```bash
cp /path/to/paper.pdf ../pdf-archive/papers/example-2501-12345.pdf
```

然后进入资产仓库并提交：

```bash
cd ../pdf-archive
git add papers/example-2501-12345.pdf
git commit -m "Add example-2501-12345 PDF"
git push
```

说明：

- PDF 文件名默认采用 `<slug>.pdf`
- 所有 PDF 都存放在 `papers/` 目录下
- Git LFS 会负责实际大文件的存储

### 2. 计算 PDF 的 sha256

Linux:

```bash
sha256sum ../pdf-archive/papers/example-2501-12345.pdf
```

macOS:

```bash
shasum -a 256 ../pdf-archive/papers/example-2501-12345.pdf
```

把输出的哈希值保存下来，后面要写入论文笔记的 front matter。

### 3. 整理论文笔记内容

在主仓库中将论文整理为一个 Hugo page bundle：

```text
content/papers/example-2501-12345/
├── index.md
├── fig1_xxx.png
└── fig2_xxx.png
```

约定：

- 每篇论文放在 `content/papers/<slug>/`
- `index.md` 是正文入口
- 只复制需要公开展示的精选图片
- 不要把原始 PDF 放入主仓库

### 4. 写 front matter

`content/papers/example-2501-12345/index.md` 顶部至少应包含：

```yaml
---
title: "XXX 论文阅读笔记"
list_title: "XXX"
description: "一句话简介"
date: "2026-06-16"
math: true
tags: []
categories: ["paper-notes"]
paper_title: "论文全名"
pdf_asset: "example-2501-12345.pdf"
pdf_sha256: "<这里填刚才算出的 sha256>"
cover: "fig1_xxx.png"
---
```

字段说明：

- `title`：正文页面标题
- `list_title`：栏目列表中的简短标题，优先放论文缩写
- `description`：一句话简介，不要直接重复论文全名
- `math: true`：如果正文有公式，必须开启
- `pdf_asset`：资产仓库中的 PDF 文件名
- `pdf_sha256`：该 PDF 的校验值
- `cover`：栏目卡片的代表图片

### 5. 正文内容整理要求

- 正文内不要添加 PDF 下载链接
- 公式用 LaTeX 规范书写
- 行内变量使用 `$...$`，例如 `$m_t$`
- 独立公式使用 `$$...$$`
- 图片使用相对路径引用

例如：

```markdown
这是一个行内变量 `$m_t$`。

$$
x_t = (1 - t)x_0 + t x_1
$$
```

## 在本地获取某篇论文的 PDF

如果需要本地查看或校对某篇已经登记过的论文原文，执行：

```bash
python3 scripts/fetch-paper-pdf.py example-2501-12345
```

脚本行为：

- 读取 `content/papers/example-2501-12345/index.md` 里的 `pdf_asset` 和 `pdf_sha256`
- 优先检查本地 `../pdf-archive`
- 若该 PDF 尚未下载，会通过 `git lfs pull` 只拉取这一篇
- 最终缓存到：

```text
.cache/paper-pdfs/
```

如果想检查所有已登记论文的 PDF 元数据是否完整，可以执行：

```bash
python3 scripts/fetch-paper-pdf.py --dry-run --all
```

## 只修改已有论文笔记时怎么做

如果只是修改一篇已经发布过的论文阅读笔记：

1. 先取回该论文的 PDF：

```bash
python3 scripts/fetch-paper-pdf.py <slug>
```

2. 修改主仓库中的：

```text
content/papers/<slug>/
```

3. 本地验证并提交主仓库。

如果这次没有改动 PDF 原文，就不需要向 `pdf-archive` 提交新内容。

## 本地预览和验证

本地预览：

```bash
hugo server -D
```

正式构建与校验：

```bash
hugo --minify --gc
scripts/check-production-artifacts.sh public
```

建议在发布前至少做一次正式构建检查。

## 提交主仓库

发布新的论文笔记后，回到主仓库提交：

```bash
git add content/papers/example-2501-12345
git add .maintenance/logs
git commit -m "Publish example-2501-12345 paper note"
git push
```

如果本次只改了论文笔记，也只需要提交主仓库。

如果本次还改了 PDF 原文，则需要分别提交：

- `../pdf-archive`
- `LazySapphire.github.io`

## 不应提交的内容

以下内容不应进入主仓库 Git 历史：

- `public/`
- `.tmp/`
- `.cache/`
- `resources/`

特别说明：

- `.tmp/` 只用于本地计划和临时处理
- `.cache/paper-pdfs/` 是本地按需拉下来的 PDF 缓存
- `public/` 是 Hugo 构建产物，不是源码

## 推荐的最短上手流程

如果只是想在新机器上尽快进入可维护状态，最短流程如下：

```bash
git clone git@github.com:LazySapphire/LazySapphire.github.io.git
cd LazySapphire.github.io
git lfs install
scripts/bootstrap-pdf-archive.sh
```

完成后，这台机器就具备了继续新增论文阅读笔记和按需获取 PDF 的能力。
