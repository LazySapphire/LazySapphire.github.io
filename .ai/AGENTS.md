# AI Agent Guide

This directory contains repository-specific guidance for AI agents. Start here before choosing any skill.

## Skill Selection Rule

Do not load every skill by default. First classify the task, then load only the skill or skills that match the work.

Use this process:

1. Read the user request and identify the task type.
2. Check the skill index below.
3. Load the matching skill's `SKILL.md` only when its trigger fits the task.
4. If no skill fits, proceed with normal repository inspection and engineering judgment.
5. If multiple skills fit, load the smallest set needed and apply them in a clear order.
6. When a new skill is added, update this file and write a maintenance log.

## Current Skills

| Skill | Path | Use When | Skip When |
| --- | --- | --- | --- |
| Repository Maintenance Cycle | `.ai/skills/repository-maintenance-cycle/SKILL.md` | Planning or implementing repo maintenance, refactors, content-system changes, deployment/CI/build changes, documentation updates, or tasks that should follow plan -> implement -> validate -> log. | Tiny one-off questions, read-only explanations, or tasks unrelated to repository maintenance. |
| Paper Note Publishing | `.ai/skills/paper-note-publishing/SKILL.md` | Publishing local Markdown paper-reading notes into `content/papers/`, normalizing math, copying selected figures, configuring paper note rendering, or updating paper note conventions. | General repo work unrelated to paper notes, or read-only discussion of a paper without publishing it. |

## Repository Conventions

- `.tmp/` is local scratch space for plans and temporary artifacts. It is ignored by Git.
- `.maintenance/logs/` stores committed maintenance history. It is not published to the website.
- `public/` is Hugo generated output. Do not edit or commit it.
- Website source of truth lives in `content/`, `layouts/`, `assets/`, `static/`, `config/`, `scripts/`, and workflow files.

## Adding A New Skill

When adding a skill:

1. Create it under `.ai/skills/<skill-name>/`.
2. Keep `SKILL.md` concise and task-specific.
3. Include `agents/openai.yaml` metadata when practical.
4. Validate the skill structure.
5. Add the skill to the Current Skills table above.
6. Record the addition in `.maintenance/logs/`.
