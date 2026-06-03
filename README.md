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

## Content Workflow

Create future content under `content/`:

- Blog posts: `content/posts/<slug>/index.md`
- Projects: `content/projects/<slug>/index.md`
- Tools: `content/tools/<slug>/index.md`

Use lowercase English slugs with hyphens. Keep generated files out of Git.
