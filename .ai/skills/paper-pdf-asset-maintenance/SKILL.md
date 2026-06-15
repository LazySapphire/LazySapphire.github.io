---
name: paper-pdf-asset-maintenance
description: "Maintain archived paper PDFs outside the Hugo site repo. Use when registering paper PDFs in the external `pdf-archive` GitHub repository, updating `pdf_asset` and `pdf_sha256` metadata in `content/papers/`, fetching PDFs into the local ignored cache, or keeping public paper pages free of PDF download links."
---

# Paper PDF Asset Maintenance

## Overview

Use this skill when the task is about preserving source PDFs for paper-reading notes without bloating the site repository.

This repository uses a split model:

- `content/papers/` publishes the note and curated figures.
- PDFs live in a separate GitHub repository as plain tracked files.
- Local machines fetch PDFs on demand into `.cache/paper-pdfs/`.
- Public pages do not provide PDF links.

## Repository Contract

Default external asset settings live in `config/_default/hugo.toml` under `[params.paper_assets]`.

Current convention:

- GitHub repo: `LazySapphire/pdf-archive`
- Branch: `main`
- PDF root: `papers/`
- Cache dir: `.cache/paper-pdfs`

Per-paper metadata belongs in `content/papers/<slug>/index.md`:

- `pdf_asset`
- `pdf_sha256`

Use `<slug>.pdf` as the asset name unless there is a strong reason not to.

## Workflow

### 1. Confirm The Paper Slug

- Reuse the published paper note slug under `content/papers/<slug>/`.
- Keep the PDF asset name aligned with the slug when possible.

### 2. Upload Or Replace The PDF In The Asset Repo

- Use the configured GitHub PDF repo.
- Upload the file under `papers/<slug>.pdf`.
- Prefer a stable asset path such as `papers/heracles-2603-27756.pdf`.

### 3. Record Metadata In The Note

Update the paper note front matter:

```yaml
pdf_asset: "heracles-2603-27756.pdf"
pdf_sha256: "<sha256>"
```

- `pdf_sha256` should match the exact uploaded file.
- Keep this metadata for tooling only; do not render it in the public page.

### 4. Keep The Website Free Of PDF Access Links

- Remove explicit `PDF` links from the note body.
- Do not add PDF buttons, cards, or downloads to Hugo templates unless the user changes the policy.

### 5. Fetch Locally When Needed

Use:

```bash
python3 scripts/fetch-paper-pdf.py <slug>
python3 scripts/fetch-paper-pdf.py --all
python3 scripts/fetch-paper-pdf.py --dry-run --all
```

Expected behavior:

- the script reads paper metadata from `content/papers/*/index.md`
- builds the `raw.githubusercontent.com` URL from site config
- downloads into `.cache/paper-pdfs/`
- verifies `pdf_sha256`
- reuses a valid cached copy

### 6. Validate And Log

For workflow changes, validate with:

```bash
python3 scripts/fetch-paper-pdf.py --dry-run --all
hugo --minify --gc
scripts/check-production-artifacts.sh public
```

Then record the completed work in `.maintenance/logs/feature-maintenance/YYYY-Www.md`.
