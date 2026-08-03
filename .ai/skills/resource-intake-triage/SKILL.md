---
name: resource-intake-triage
description: "Triage and publish non-paper knowledge resources for this Hugo site. Use when the user drops a product announcement, company news item, open-source repository, technical article, demo, online website tool, service page, or pasted external information that should be saved under content/resources/ with summary, use cases, topics, status, and source metadata."
---

# Resource Intake Triage

## Overview

Turn loose external material into a small, useful resource entry under `content/resources/`. This is the default workflow for non-paper links and pasted information.

## Routing

- Use `paper-brief-publishing` instead when the item is primarily an academic paper, arXiv page, research project page, or paper title.
- Use `topic-survey` instead when the user asks for a multi-source overview of a topic.
- Use `paper-note-publishing` when publishing a long-form paper reading note under `content/papers/`.

## Workflow

1. Inspect the provided URL or pasted content. Browse when the source is current, external, or likely to have changed.
2. Classify `resource_type` as one of:
   - `web-tool`: online tool, demo site, hosted service, calculator, playground, converter, dataset browser, benchmark browser.
   - `open-source`: GitHub/GitLab repository or openly released codebase.
   - `product`: product launch, model release, platform feature, API, SDK, hardware, service.
   - `company-news`: company announcement, acquisition, roadmap, funding, policy, staffing, partnership.
   - `article`: technical article, blog post, explainer, tutorial, interview.
   - `demo`: video, interactive demo, showcase, experiment.
3. Create a stable lowercase slug. Prefer the project or product name, with company/source prefix only when useful.
4. Create `content/resources/<slug>/index.md`.
5. Write concise front matter:

```yaml
---
title: ""
date: "YYYY-MM-DD"
description: ""
source_url: ""
source_name: ""
cover: ""
cover_caption: ""
cover_source: ""
cover_credit: ""
resource_type: "web-tool"
status: "triaged"
topics: []
tags: []
categories: ["resources"]
use_case: ""
why_save: ""
---
```

6. Write the body in this shape:

```markdown
## What It Is

## Why It Matters

## Possible Uses

## Notes
```

Keep each section short. The page should help future-you remember whether the item is worth reopening.

## Status

- `inbox`: saved with minimal processing; use when the user explicitly wants quick capture only.
- `triaged`: source has been inspected, summarized, and tagged.
- `useful`: known to be practically useful or repeatedly referenced.
- `archived`: no longer current, duplicated, unavailable, or probably not useful.

Default to `triaged` when you have inspected the source. Do not over-promote entries to `useful`.

## Summary Style

- Prefer Chinese prose unless the source title is best left in English.
- Do not hype. Explain what it does, what it may be useful for, and any obvious limitation.
- Preserve source attribution with `source_url` and `source_name`.
- Prefer visually useful entries. When an official project page, product page, paper page, or repository provides a relevant image, save one small cover image in the page bundle, set `cover`, and include `cover_source` / `cover_credit`.
- For resources with diagrams, screenshots, architecture images, or product visuals, add one inline figure when it improves later scanning. Use Markdown image syntax or Hugo's `figure` shortcode; raw HTML figures may be stripped. Do not use decorative stock images.
- For online tools, always mention whether it appears to require login, local install, API key, or payment.
- For open-source repositories, include license, last activity, language, and maturity only if readily visible.
- Do not save large downloaded artifacts in the site repo.
