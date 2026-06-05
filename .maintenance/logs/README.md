# Maintenance Logs

Maintenance history is grouped by work type and ISO week.

## Categories

- `feature-maintenance/`: repository structure, build/deploy workflow, AI guidance, content-system changes, and maintenance-process changes.
- `frontend-optimization/`: navigation, layout, styling, reading experience, and client-side UI behavior.
- `note-publishing/`: paper notes, general notes, and other content publishing records.

## Naming

Use one file per category per ISO week:

```text
.maintenance/logs/<category>/YYYY-Www.md
```

Example:

```text
.maintenance/logs/note-publishing/2026-W23.md
```

## Entry Shape

Each weekly file should append entries with:

- Date and concise title.
- Background.
- Implemented changes.
- Validation.
- Follow-ups when relevant.

Keep `.tmp/` plans local and ignored. Maintenance logs are committed but are not published to the website.

