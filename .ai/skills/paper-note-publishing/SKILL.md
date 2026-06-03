---
name: paper-note-publishing
description: "Publish local Markdown paper-reading notes into this Hugo site's Papers section. Use when processing notes from .tmp/papers_read or another local paper-note folder, creating content/papers page bundles, normalizing front matter, copying selected figures, converting formula blocks to LaTeX-rendered math, constraining image display, or updating paper-note publishing conventions."
---

# Paper Note Publishing

## Overview

Use this skill to turn local Markdown paper notes into publishable Hugo pages under `content/papers/`. The goal is a repeatable pipeline: import note, normalize metadata, publish only curated assets, render math with KaTeX, keep images readable, validate, and log the maintenance work.

This site relies on Hugo Goldmark passthrough plus KaTeX auto-render for formulas. If formula backslashes are being removed in generated HTML, check `config/_default/markup.toml` before editing formulas around the problem.

## Workflow

### 1. Inspect The Local Note

- Locate the source folder, usually `.tmp/papers_read/<paper-id>/`.
- Identify the main Markdown file, usually `README.md`.
- List assets and separate curated figures from raw extraction artifacts.
- Do not publish PDFs, raw extracted images, or TXT dumps unless the user explicitly asks.

### 2. Create A Hugo Page Bundle

Use this target shape:

```text
content/papers/<stable-paper-slug>/
├── index.md
├── fig1_*.png
├── fig2_*.png
└── ...
```

Slug guidance:

- Prefer lowercase English slugs.
- Include arXiv identifier when available, e.g. `heracles-2603-27756`.
- Keep image files near `index.md` so Markdown can use relative links.

### 3. Normalize Front Matter

Add front matter before the note body:

```yaml
---
title: "<note title>"
description: "<one sentence summary>"
date: "YYYY-MM-DD"
math: true
tags: []
categories: ["paper-notes"]
paper_title: "<paper title>"
arxiv: "<id if available>"
---
```

Remove local-only lines such as links to `./paper.pdf` or `./paper.txt` unless those files are intentionally published.

### 4. Normalize Math

Pages with formulas should set:

```yaml
math: true
```

Convert formula code fences or ASCII formulas into LaTeX delimiters where practical:

```markdown
$$
x_t = (1 - t)x_0 + t x_1,\quad t \in [0,1]
$$
```

Use `$...$` for concise inline formulas and `$$...$$` for display formulas. Keep ordinary variable mentions as code if mathematical rendering would add little value.

Generated HTML should preserve LaTeX backslashes inside math delimiters, including `\\` aligned line breaks and commands such as `\left\|...\right\|`.

### 5. Normalize Images

- Copy only curated figures needed by the note.
- Prefer relative image links such as `![Framework](fig2_framework.png)`.
- Keep raw extracted images out of the published page bundle unless explicitly requested.
- Rely on site CSS for paper-note image sizing; do not hard-code width attributes in Markdown by default.

### 6. Validate

Run:

```bash
hugo --minify --gc
scripts/check-production-artifacts.sh public
```

Check generated HTML for:

- KaTeX CSS/JS on pages with `math: true`.
- Paper images under the page bundle.
- No `.tmp/` asset references.
- No raw extracted image dump accidentally published.

### 7. Record Maintenance

When the publishing work is complete, write a log under `.maintenance/logs/` describing:

- Source note folder.
- Published paper slug.
- Assets copied.
- Math/image handling decisions.
- Validation performed.
