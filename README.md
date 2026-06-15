# LazySapphire.github.io

Personal static site source for GitHub Pages.

The repository is standardized around Hugo source files. Generated output belongs in `public/` and should not be committed.

## Structure

- `config/_default/`: Hugo site configuration.
- `content/`: Markdown content entries.
- `layouts/`: Self-contained Hugo templates.
- `assets/`: CSS and JavaScript processed by Hugo.
- `static/`: Static files copied to the site root.
- `scripts/`: Local and CI validation scripts.
- `.cache/paper-pdfs/`: Locally fetched paper PDFs for note maintenance, ignored by Git.
- `.maintenance/logs/`: Repository maintenance history, not published to the site.
- `.tmp/`: Local planning and migration notes, ignored by Git.

## Local Preview

Install Hugo, then run:

```bash
hugo server -D
```

Build production output:

```bash
hugo --minify --gc
scripts/check-production-artifacts.sh public
```

## Paper PDF Workflow

Paper PDFs are not published through the website. They are archived in a separate GitHub repository and fetched locally on demand when updating reading notes.

Recommended external PDF repository contract:

- Repository: `LazySapphire/pdf-archive`
- Visibility: public
- Branch: `main`
- PDF root: `papers/`
- Asset naming: `<paper-slug>.pdf`

Examples:

- `heracles-2603-27756.pdf`
- `parc-2025.pdf`
- `mugen-2605-24592.pdf`

Each published paper note keeps maintenance-only metadata in `content/papers/<slug>/index.md`:

- `pdf_asset`
- `pdf_sha256`

Fetch a local copy when needed:

```bash
python3 scripts/fetch-paper-pdf.py heracles-2603-27756
python3 scripts/fetch-paper-pdf.py --all
python3 scripts/fetch-paper-pdf.py --dry-run --all
```

Downloaded PDFs are stored under `.cache/paper-pdfs/` and stay out of Git history.

## Content Workflow

Create future content under `content/`:

- Blog posts: `content/posts/<slug>/index.md`
- Projects: `content/projects/<slug>/index.md`
- Tools: `content/tools/<slug>/index.md`

Use lowercase English slugs with hyphens. Keep generated files out of Git.
