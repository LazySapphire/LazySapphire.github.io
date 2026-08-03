---
name: paper-brief-publishing
description: "Create and publish quick paper brief pages for this Hugo site. Use when the user provides an arXiv link, paper title, research project page, abstract, Semantic Scholar/OpenReview/DOI link, or asks to save a new paper for later without doing a full reading note. Prefer paper-search metadata lookup; publish under content/paper-briefs/."
---

# Paper Brief Publishing

## Overview

Turn a paper link or title into a compact brief under `content/paper-briefs/`. This is the default paper workflow before a paper is promoted to a long-form note in `content/papers/`.

## Routing

- Use `paper-search` to resolve metadata when available. Prefer targeted sources such as `arxiv,semantic,crossref,openalex`.
- Use `pdf` only when full-text PDF layout or figures must be inspected.
- Use `paper-note-publishing` only when creating a detailed reading note with curated figures and math.
- Use `topic-survey` when the user asks for multiple papers around a topic.

## Metadata Lookup

For paper titles or rough queries:

```bash
paper-search search "<query>" -n 3 -s arxiv,semantic,crossref,openalex
```

For an arXiv link, extract the arXiv ID and search the title or ID. If multiple records conflict, prefer the official arXiv page for arXiv metadata and use the project page only for supplementary links.

## Target Shape

Create:

```text
content/paper-briefs/<slug>/index.md
```

Front matter:

```yaml
---
title: ""
list_title: ""
date: "YYYY-MM-DD"
description: ""
cover: ""
cover_caption: ""
cover_source: ""
cover_credit: ""
paper_title: ""
authors: []
year:
venue: ""
arxiv: ""
doi: ""
paper_url: ""
project_url: ""
code_url: ""
status: "triaged"
reading_level: "brief"
topics: []
tags: []
categories: ["paper-briefs"]
---
```

Use `paper_url` for the canonical abstract/landing page, not a PDF download URL. Keep PDF asset fields out of paper briefs.

## Body Shape

```markdown
## One-Line Takeaway

## Problem

## Method

## Why Save It

## Limitations Or Questions

## Links
```

Keep it short. A brief should be scannable in one or two minutes.

## Promotion Rule

If the user later asks for a deep read, create or move to `content/papers/<slug>/` using `paper-note-publishing`. Do not overwrite the brief unless the user wants the brief replaced.

## Quality Bar

- Do not fabricate metadata. If a field cannot be verified, omit it or leave it empty.
- Clearly distinguish paper claims from your inference.
- Prefer stable slugs: `<short-name>-<arxiv-id>` for arXiv papers, otherwise `<short-name>-<year>`.
- When an official project page or paper page has a representative figure, save one small cover image in the page bundle, set `cover`, and attribute it with `cover_source` / `cover_credit`.
- Use Markdown image syntax or Hugo's `figure` shortcode for inline visuals; raw HTML figures may be stripped.
- Keep tags stable and reusable. Good examples: `robotics`, `llm-agent`, `simulation`, `dexterous-hand`, `paper-tooling`, `offline-rl`.
