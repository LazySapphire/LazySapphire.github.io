---
name: repository-maintenance-cycle
description: "Repository maintenance workflow for this site: use when planning or implementing repo changes, refactors, content-system updates, deployment changes, CI/build changes, documentation updates, or any task where an agent should first draft a plan in .tmp, confirm scope, implement carefully, validate, and record completed work under .maintenance/logs."
---

# Repository Maintenance Cycle

## Overview

Use this skill to keep repository maintenance deliberate and auditable. The expected cycle is: plan locally, confirm when needed, implement, validate, then record the completed work as repository maintenance history.

## Workflow

### 1. Inspect Before Planning

- Check `git status --short --ignored` before edits.
- Read the relevant source files before making assumptions.
- Treat `public/` as generated output, not a source-of-truth directory.
- Treat `.tmp/` as local planning scratch space; do not commit it.
- Treat `.maintenance/logs/` as committed repository maintenance history, organized by category and ISO week.

### 2. Write The Plan First

For non-trivial changes, create or update a plan in `.tmp/`.

Recommended plan filename:

```text
.tmp/YYYY-MM-DD_<short-summary>_plan.md
```

The plan should include:

- Objective.
- Current repository observations.
- Scope and non-goals.
- Files/directories likely to change.
- Step-by-step implementation sequence.
- Validation commands.
- Risks, rollback notes, and open questions.

Ask for confirmation before implementation when the change is broad, destructive, changes deployment, deletes content, or the user explicitly requested plan-first work.

### 3. Implement Against The Plan

- Keep edits scoped to the confirmed plan.
- Prefer source directories: `content/`, `layouts/`, `assets/`, `static/`, `config/`, `scripts/`, `.github/`.
- Do not hand-edit generated files in `public/`.
- Keep `.tmp/` ignored and local.
- Preserve unrelated user changes.
- If the implementation changes the plan materially, update the plan or explain the deviation before continuing.

### 4. Validate

Use the validation surface appropriate to the change. For this Hugo site, prefer:

```bash
hugo --minify --gc
scripts/check-production-artifacts.sh public
```

When deployment is changed or requested:

- Push only when the user asks or the task clearly requires it.
- Wait for GitHub Actions when possible.
- Verify the public URL with `curl` or browser access.
- Remember GitHub Pages may cache plain URLs briefly; use a query string to bypass cache during verification.

### 5. Record Completed Work

After a plan is implemented and validated, append a maintenance log entry under:

```text
.maintenance/logs/<category>/YYYY-Www.md
```

Use the category that best matches the work:

- `feature-maintenance/`: repository structure, build/deploy workflow, AI guidance, content-system changes, and maintenance-process changes.
- `frontend-optimization/`: navigation, layout, styling, reading experience, and client-side UI behavior.
- `note-publishing/`: paper notes, general notes, and other content publishing records.

Each weekly entry should include:

- Background.
- Implemented changes.
- Decisions made.
- Validation performed.
- Follow-ups.

See `.maintenance/logs/README.md` for the current convention.

Do not publish maintenance logs through Hugo. Keep them outside `content/` and `static/`.

## Commit Guidance

When committing is requested:

- Run validation first.
- Stage source changes and relevant `.maintenance/logs/` weekly files.
- Do not stage `.tmp/` or `public/`.
- Use a concise commit message describing the repository change.
- After pushing, refresh remote tracking refs and verify the deployed site when relevant.
