# LazySapphire.github.io

这是我的个人静态站点源码仓库。

这里放的是 Hugo 源码、正文内容、页面模板、样式脚本和维护记录。`public/` 里的构建产物不提交。

## 仓库结构

- `content/`：公开内容，包含主页、项目、笔记、论文阅读笔记等。
- `layouts/`：站点模板和页面布局。
- `assets/`：Hugo 处理的样式和脚本。
- `static/`：直接发布到站点根目录的静态文件。
- `config/`：Hugo 配置。
- `scripts/`：本地维护脚本和校验脚本。
- `.maintenance/logs/`：仓库维护历史，不发布到网页。
- `.tmp/`：本地计划、迁移说明和临时记录，不进 Git。
- `.cache/paper-pdfs/`：本机按需下载的论文 PDF 缓存，不进 Git。

## 本地运行

先安装 Hugo，然后执行：

```bash
hugo server -D
```

生成正式构建：

```bash
hugo --minify --gc
scripts/check-production-artifacts.sh public
```

## 提交边界

应提交的内容：

- `content/`
- `layouts/`
- `assets/`
- `static/`
- `config/`
- `scripts/`
- `.ai/`
- `.maintenance/logs/`

不应提交的内容：

- `public/`
- `.tmp/`
- `.cache/`
- `resources/`

## 内容维护

新增内容时，优先放进 `content/` 下对应栏目。

论文阅读笔记放在 `content/papers/<slug>/`，每篇论文是一组 page bundle。页面里只展示笔记和精选图片，不直接提供 PDF 阅读入口。

## 论文 PDF 同步

论文原文 PDF 不放在主站仓库里，而是放在独立仓库，并由 Git LFS 管理：

- `git@github.com:LazySapphire/pdf-archive.git`

这个仓库只负责保存 PDF 文件。主站在更新论文笔记时，通过本地脚本优先使用本地 `pdf-archive` 工作区，必要时再拉取对应 PDF。

使用这套流程前，维护机器需要先安装 `git-lfs`。

### 同步方式

1. 先用 `scripts/bootstrap-pdf-archive.sh` 准备本地 `pdf-archive` 工作区。
2. 在 `pdf-archive` 里更新或添加 `papers/<paper-slug>.pdf`，然后提交并推送。
3. 主站论文笔记里记录对应的：
   - `pdf_asset`
   - `pdf_sha256`
4. 在主站本地执行：

```bash
python3 scripts/fetch-paper-pdf.py <paper-slug>
```

例如：

```bash
python3 scripts/fetch-paper-pdf.py heracles-2603-27756
```

批量校验和同步：

```bash
python3 scripts/fetch-paper-pdf.py --all
python3 scripts/fetch-paper-pdf.py --dry-run --all
```

下载后的 PDF 默认缓存到 `.cache/paper-pdfs/`。如果本地已经有 `pdf-archive` 工作区，脚本会优先从那里读取。

`scripts/bootstrap-pdf-archive.sh` 使用浅克隆并跳过 LFS 自动下载，因此只会拉下资产仓库的 Git 元数据和小型指针文件，不会把历史 PDF 全量同步到本机。

## 多端维护

在另一台电脑上重新克隆这个仓库后，先跑一次：

```bash
git lfs install
scripts/bootstrap-pdf-archive.sh
```

这样会在主仓库旁边准备一个 `../pdf-archive` 工作区，但不会把其中所有 PDF 下载到本机。只有在你执行 `python3 scripts/fetch-paper-pdf.py <paper-slug>` 时，对应论文的 PDF 才会按需拉取到本地缓存。

如果你要在新机器上新增或替换一篇论文的 PDF，流程是：

```bash
cp /path/to/paper.pdf ../pdf-archive/papers/<paper-slug>.pdf
cd ../pdf-archive
git add papers/<paper-slug>.pdf
git commit -m "Add <paper-slug> PDF"
git push
```

然后回到主仓库，更新该论文笔记的 `pdf_asset` 和 `pdf_sha256`，再执行：

```bash
python3 scripts/fetch-paper-pdf.py <paper-slug>
```

建议的日常流程是：

1. 先同步主仓库。
2. 需要更新原文时，在 `pdf-archive` 里提交 PDF。
3. 需要看原文时，主仓库脚本会自动从本地 archive 工作区取文件。
4. 修改论文笔记后，再提交主仓库。

如果这次改动涉及 PDF 原文本身，也要同步更新 `pdf-archive`。

## AI 维护入口

给后续 AI agent 用的仓库约定和流程说明在：

- `.ai/AGENTS.md`
- `.ai/skills/`

如果是仓库维护、内容发布、PDF 归档或结构调整，先看这里，再决定用哪个 skill。
