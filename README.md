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

常用资料栏目：

- `content/resources/`：资料速记，保存产品资讯、开源项目、在线工具、技术文章和临时收藏。
- `content/paper-briefs/`：论文速读，从 arXiv、项目主页或论文标题快速整理出的论文卡片。
- `content/surveys/`：主题综述，围绕研究方向、工具生态或技术趋势整理的轻量概览。
- `content/papers/`：论文精读，保存长篇阅读笔记、公式和精选图片。

论文阅读笔记放在 `content/papers/<slug>/`，每篇论文是一组 page bundle。页面里只展示笔记和精选图片，不直接提供 PDF 阅读入口。

资料整理与 skill 使用说明见：

- `docs/guide_资料整理与技能使用指南.md`

## AI 小游戏

- 栏目入口：`/ai-games/`，在首页和主导航中可见。
- 制作记录：`content/ai-games/<slug>/index.md`，记录玩法、模型配置、版本与验证情况。
- 游玩源码：`static/games/<slug>/`，直接发布到 `/games/<slug>/`。游戏应使用相对资源路径，运行时不依赖本地开发服务。
- 截图：使用游戏实际运行画面，放在对应游戏目录中，同时用于列表和分享预览。
- 新增游戏时沿用 `echo-lab` 的元数据字段和模板，不必为每个游戏修改全站布局。

栏目也收录互动动画，例如 `/games/pelican-bicycle/` 的《顺风，慢行》。这类作品可以省略 `game_rooms` 和未记录的 `game_model` / `game_reasoning`，使用可选的 `play_label`、`cover_caption` 指定入口文案和封面说明；已有游戏保留默认展示。

作品设置 `direct_play: true` 时，栏目标题直接打开 `play_url`，制作记录保留单独按钮。《顺风，慢行》的独立 HTML 保持原始设计，不注入站点主题或导航。

首款游戏《回声实验室》v2 有 25 个自由选择的房间、5 个章节；`levels.js` 是关卡数据，`core.js` 负责确定性的共享物理与输入回放，`game.js` 负责显示和操作。每个关卡必须有正常输入的通关验证，修改机制时补上相应回归。测试：

```bash
node scripts/tests/echo-lab.cjs
node scripts/tests/echo-lab-physics.cjs
```

`static/games/echo-lab/` 是发布后继续维护的版本；相邻的本地 `echo-loop` 原型不参与站点构建。公开制作记录与不公开的仓库维护日志分别保存在 `content/ai-games/` 和 `.maintenance/logs/`。

直达某关使用 `/games/echo-lab/#room=25`；旧的 `echo-lab-progress-v1` 本地存档键继续保留，前五关编号不变。发布更新时同步修改记录中的版本、关卡数和游戏 HTML 的资源版本参数。

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

当前常用外部 skill 已安装在用户级 Codex skills 中：

- `paper-search`
- `pdf`
- `playwright`
- `literature-review`
