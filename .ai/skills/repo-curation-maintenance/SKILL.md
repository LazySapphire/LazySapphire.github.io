---
name: repo-curation-maintenance
description: "Maintain and clean this Hugo knowledge repository after many resources, paper briefs, surveys, or notes have accumulated. Use when the user asks to review inbox items, normalize tags, find duplicate links, check stale URLs, promote or archive entries, reorganize collections, or run a periodic curation pass."
---

# Repo Curation Maintenance

## Overview

Keep the knowledge repository useful as entries accumulate. This skill focuses on small curation passes, not broad redesigns.

## Workflow

1. Inspect current state:
   - `content/resources/`
   - `content/paper-briefs/`
   - `content/surveys/`
   - `content/papers/`
2. Identify one or more curation targets:
   - inbox entries
   - duplicate `source_url` or `paper_url`
   - stale or unreachable links
   - inconsistent `resource_type`, `status`, `topics`, `tags`, or `categories`
   - paper briefs that should be promoted to long-form paper notes
   - old entries that should be marked `archived`
3. Make minimal edits. Preserve existing prose unless it is inaccurate or duplicated.
4. Validate with Hugo build when public content changes.
5. Record maintenance under `.maintenance/logs/feature-maintenance/` or `.maintenance/logs/note-publishing/`.

## Status Rules

- `inbox`: captured but not inspected.
- `triaged`: inspected and summarized.
- `useful`: repeatedly useful or clearly worth keeping close.
- `archived`: outdated, duplicated, unavailable, or no longer useful.
- `draft`: incomplete survey or note.
- `maintained`: reviewed survey that can serve as a stable overview.

Do not delete entries by default. Prefer `archived` plus a short note explaining why.

## Link Checks

For a quick pass, collect URLs with `rg` and check only the target subset requested by the user. Avoid hammering external sites.

Useful commands:

```bash
rg -n "source_url:|paper_url:|project_url:|code_url:" content
rg -n "status: \"?inbox|status: \"?draft" content
```

## Tag Hygiene

Prefer a small stable vocabulary. Good topic/tag examples:

```text
robotics, dexterous-hand, humanoid, simulation, offline-rl,
llm-agent, paper-tooling, dev-tool, web-tool, open-source,
benchmark, dataset, product, company-news
```

When adding a new tag, check whether an existing one already covers the meaning.
