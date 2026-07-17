# 资料整理与 Skill 使用指南

这份文档说明如何把链接、论文、在线工具、产品资讯和主题材料整理进个人主页仓库。

## 日常入口

### 非论文资料

使用 `resource-intake-triage`。

适用内容:

- 公司产品发布
- 开源项目
- 在线网站工具
- 技术文章
- Demo、视频、Playground
- 感觉以后会有用但现在没时间细看的资料

输出位置:

```text
content/resources/<slug>/index.md
```

核心字段:

```yaml
resource_type: "web-tool"
status: "triaged"
source_url: ""
source_name: ""
use_case: ""
why_save: ""
topics: []
tags: []
```

### 论文速读

使用 `paper-brief-publishing`，并优先调用已安装的外部 `paper-search` skill/CLI。

适用内容:

- arXiv 链接
- 论文标题
- 项目主页
- DOI、Semantic Scholar、OpenReview 等论文入口

输出位置:

```text
content/paper-briefs/<slug>/index.md
```

常用命令:

```bash
paper-search search "<query>" -n 3 -s arxiv,semantic,crossref,openalex
paper-search sources
```

论文速读不保存 PDF。需要精读时，再用 `paper-note-publishing` 整理到 `content/papers/`。

### 主题综述

使用 `topic-survey`。

适用内容:

- 某个研究方向最近有什么进展
- 某类工具生态有哪些代表项目
- 多家公司/多个项目之间的横向比较

输出位置:

```text
content/surveys/<topic-slug>/index.md
```

正式系统综述才使用外部 `literature-review` skill；日常整理默认不走重型综述流程。

## 已安装的外部 Skills

- `paper-search`: 学术论文多源检索，配套 CLI `paper-search`。
- `pdf`: 精读阶段需要检查 PDF 布局、抽取全文或看图时使用。
- `playwright`: 改站点页面或导航后，用真实浏览器检查页面。
- `literature-review`: 正式系统综述时使用，日常不用默认触发。

## 状态约定

- `inbox`: 只保存，尚未整理。
- `triaged`: 已看过来源，写过摘要和标签。
- `useful`: 已确认经常有用或值得重点保留。
- `archived`: 过时、重复、失效或暂时不再有价值。
- `draft`: 主题综述或笔记初稿。
- `maintained`: 已复查并可作为稳定入口的主题综述。

## 定期整理

使用 `repo-curation-maintenance`。

推荐每积累一批资料后做一次:

1. 找出 `status: inbox` 的条目。
2. 检查重复链接。
3. 统一 `topics` 和 `tags`。
4. 标记失效或过时资料为 `archived`。
5. 把值得深读的论文从 `paper-briefs` 提升到 `papers`。

