---
name: topic-survey
description: "Create lightweight topic surveys for this Hugo knowledge repository. Use when the user asks for an overview of a research or technology area, recent trend, company/product landscape, open-source ecosystem, or a group of related papers/resources that should be synthesized under content/surveys/ rather than saved as one resource or one paper brief."
---

# Topic Survey

## Overview

Create a concise, evolving overview page for a topic. This is lighter than a formal literature review and is meant for personal orientation and future retrieval.

## Routing

- Use `paper-search` for academic topic discovery.
- Use web search for current company, product, tool, or open-source landscape questions.
- Use installed `literature-review` only when the user explicitly wants a formal systematic review, citation verification, or publication-style report.
- Use `resource-intake-triage` for one non-paper link.
- Use `paper-brief-publishing` for one paper.

## Workflow

1. Clarify scope only if the topic is too broad to survey. Otherwise default to a small survey.
2. Gather 8-20 representative sources:
   - academic: prefer `paper-search search "<query>" -n 5 -s arxiv,semantic,crossref,openalex`
   - products/tools/news: browse current official pages, GitHub repos, release notes, and reputable announcements
3. Group sources into 3-6 themes.
4. Create `content/surveys/<topic-slug>/index.md`.
5. Link out to existing `resources`, `paper-briefs`, or `papers` when relevant.

## Target Front Matter

```yaml
---
title: ""
date: "YYYY-MM-DD"
description: ""
status: "draft"
survey_type: "lightweight"
topics: []
tags: []
categories: ["surveys"]
source_count:
time_window: ""
---
```

Use `status: draft` for a first pass and `status: maintained` only after the survey has been reviewed or updated multiple times.

## Body Shape

```markdown
## Snapshot

## Why This Topic Matters

## Main Themes

## Representative Items

## Open Questions

## Related Entries
```

The survey should summarize the shape of the field, not just list links.

## Quality Bar

- Use dates for current claims, especially product launches and recent papers.
- Separate facts from interpretation.
- Prefer primary sources for product and project claims.
- Keep the page easy to update. Avoid overlong prose and formal citation machinery unless the user asks for it.
