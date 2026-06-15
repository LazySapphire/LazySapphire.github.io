#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
CONTENT_ROOT = REPO_ROOT / "content" / "papers"
CONFIG_PATH = REPO_ROOT / "config" / "_default" / "hugo.toml"
FRONT_MATTER_RE = re.compile(r"\A---\n(.*?)\n---\n", re.DOTALL)
YAML_LINE_RE = re.compile(r"^([A-Za-z0-9_]+):\s*(.*?)\s*$")
TOML_LINE_RE = re.compile(r'^([A-Za-z0-9_]+)\s*=\s*"(.*)"\s*$')


@dataclass(frozen=True)
class AssetConfig:
    github_repo: str
    repo_root: str
    branch: str
    cache_dir: Path


@dataclass(frozen=True)
class PaperNote:
    slug: str
    title: str
    bundle_dir: Path
    asset_name: str
    sha256: str


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Fetch archived paper PDFs into the local ignored cache."
    )
    parser.add_argument(
        "papers",
        nargs="*",
        help="Paper slug or content/papers bundle path.",
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Fetch all papers under content/papers/.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Validate metadata and print planned downloads without network access.",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Re-download even if a cached file already matches the expected hash.",
    )
    parser.add_argument(
        "--repo",
        help="Override the configured GitHub PDF repo, e.g. LazySapphire/pdf-archive.",
    )
    parser.add_argument(
        "--branch",
        help="Override the configured Git branch that stores the PDFs.",
    )
    parser.add_argument(
        "--repo-root",
        help="Override the configured root directory inside the PDF repo.",
    )
    parser.add_argument(
        "--cache-dir",
        help="Override the configured local cache directory.",
    )
    args = parser.parse_args()
    if not args.all and not args.papers:
        parser.error("provide one or more paper slugs/paths, or use --all")
    return args


def unquote(value: str) -> str:
    value = value.strip()
    if len(value) >= 2 and value[0] == value[-1] and value[0] in {'"', "'"}:
        return value[1:-1]
    return value


def load_asset_config(config_path: Path) -> AssetConfig:
    if not config_path.is_file():
        raise FileNotFoundError(f"Missing Hugo config: {config_path}")

    current_section = None
    values: dict[str, str] = {}

    for raw_line in config_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("[") and line.endswith("]"):
            current_section = line[1:-1].strip()
            continue
        if current_section != "params.paper_assets":
            continue
        match = TOML_LINE_RE.match(line)
        if match:
            values[match.group(1)] = match.group(2)

    required = ("github_repo", "repo_root", "branch", "cache_dir")
    missing = [key for key in required if not values.get(key)]
    if missing:
        raise ValueError(
            f"Missing [params.paper_assets] keys in {config_path}: {', '.join(missing)}"
        )

    cache_dir = Path(values["cache_dir"])
    if not cache_dir.is_absolute():
        cache_dir = REPO_ROOT / cache_dir

    return AssetConfig(
        github_repo=values["github_repo"],
        repo_root=values["repo_root"],
        branch=values["branch"],
        cache_dir=cache_dir,
    )


def parse_front_matter(markdown_path: Path) -> dict[str, str]:
    text = markdown_path.read_text(encoding="utf-8")
    match = FRONT_MATTER_RE.match(text)
    if not match:
        raise ValueError(f"Missing YAML front matter: {markdown_path}")

    data: dict[str, str] = {}
    for raw_line in match.group(1).splitlines():
        line = raw_line.rstrip()
        if not line or line.lstrip().startswith("#"):
            continue
        if line.startswith(" ") or line.startswith("-"):
            continue
        match = YAML_LINE_RE.match(line)
        if match:
            key, raw_value = match.groups()
            data[key] = unquote(raw_value)
    return data


def resolve_slug(target: str) -> str:
    candidate = Path(target)
    if candidate.exists():
        resolved = candidate.resolve()
        if resolved.is_file():
            if resolved.name != "index.md":
                raise ValueError(f"Expected a paper bundle or index.md, got file: {target}")
            bundle_dir = resolved.parent
        else:
            bundle_dir = resolved
        return bundle_dir.name

    normalized = target.strip().rstrip("/")
    if not normalized:
        raise ValueError("Empty paper target")
    return Path(normalized).name


def load_note(slug: str) -> PaperNote:
    bundle_dir = CONTENT_ROOT / slug
    markdown_path = bundle_dir / "index.md"
    if not markdown_path.is_file():
        raise FileNotFoundError(f"Missing paper note: {markdown_path}")

    front_matter = parse_front_matter(markdown_path)
    asset_name = front_matter.get("pdf_asset", "").strip()
    sha256 = front_matter.get("pdf_sha256", "").strip().lower()
    if not asset_name or not sha256:
        raise ValueError(
            f"Missing pdf_asset/pdf_sha256 metadata in {markdown_path}"
        )

    title = (
        front_matter.get("list_title")
        or front_matter.get("title")
        or slug
    )

    return PaperNote(
        slug=slug,
        title=title,
        bundle_dir=bundle_dir,
        asset_name=asset_name,
        sha256=sha256,
    )


def iter_all_slugs() -> list[str]:
    slugs: list[str] = []
    for path in sorted(CONTENT_ROOT.iterdir()):
        if path.is_dir() and (path / "index.md").is_file():
            slugs.append(path.name)
    return slugs


def sha256sum(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def asset_url(config: AssetConfig, note: PaperNote) -> str:
    repo_root = config.repo_root.strip("/")
    quoted_asset = urllib.parse.quote(note.asset_name)
    return (
        "https://raw.githubusercontent.com/"
        f"{config.github_repo}/{urllib.parse.quote(config.branch)}/"
        f"{urllib.parse.quote(repo_root)}/{quoted_asset}"
    )


def destination_path(config: AssetConfig, note: PaperNote) -> Path:
    return config.cache_dir / note.asset_name


def download_file(url: str, destination: Path) -> None:
    request = urllib.request.Request(
        url,
        headers={"User-Agent": "LazySapphire-paper-pdf-fetcher/1.0"},
    )
    destination.parent.mkdir(parents=True, exist_ok=True)
    partial = destination.with_suffix(destination.suffix + ".partial")
    if partial.exists():
        partial.unlink()

    with urllib.request.urlopen(request) as response, partial.open("wb") as handle:
        while True:
            chunk = response.read(1024 * 1024)
            if not chunk:
                break
            handle.write(chunk)

    partial.replace(destination)


def fetch_one(note: PaperNote, config: AssetConfig, *, dry_run: bool, force: bool) -> None:
    url = asset_url(config, note)
    destination = destination_path(config, note)

    if dry_run:
        print(
            f"[dry-run] {note.slug} -> {destination} <- {url}"
        )
        return

    if destination.exists() and not force:
        current_sha = sha256sum(destination)
        if current_sha == note.sha256:
            print(f"[cached] {note.slug} -> {destination}")
            return
        print(
            f"[stale] {note.slug} cached hash {current_sha} != expected {note.sha256}; re-downloading",
            file=sys.stderr,
        )

    download_file(url, destination)
    current_sha = sha256sum(destination)
    if current_sha != note.sha256:
        destination.unlink(missing_ok=True)
        raise ValueError(
            f"Hash mismatch for {note.slug}: expected {note.sha256}, got {current_sha}"
        )

    print(f"[downloaded] {note.slug} -> {destination}")


def main() -> int:
    args = parse_args()

    try:
        config = load_asset_config(CONFIG_PATH)
    except Exception as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1

    if args.repo:
        config = AssetConfig(
            github_repo=args.repo,
            repo_root=config.repo_root,
            branch=config.branch,
            cache_dir=config.cache_dir,
        )
    if args.branch:
        config = AssetConfig(
            github_repo=config.github_repo,
            repo_root=config.repo_root,
            branch=args.branch,
            cache_dir=config.cache_dir,
        )
    if args.repo_root:
        config = AssetConfig(
            github_repo=config.github_repo,
            repo_root=args.repo_root,
            branch=config.branch,
            cache_dir=config.cache_dir,
        )
    if args.cache_dir:
        cache_dir = Path(args.cache_dir)
        if not cache_dir.is_absolute():
            cache_dir = REPO_ROOT / cache_dir
        config = AssetConfig(
            github_repo=config.github_repo,
            repo_root=config.repo_root,
            branch=config.branch,
            cache_dir=cache_dir,
        )

    targets = iter_all_slugs() if args.all else []
    targets.extend(args.papers)

    seen: set[str] = set()
    failures = 0

    for target in targets:
        try:
            slug = resolve_slug(target)
            if slug in seen:
                continue
            seen.add(slug)
            note = load_note(slug)
            fetch_one(note, config, dry_run=args.dry_run, force=args.force)
        except urllib.error.HTTPError as exc:
            failures += 1
            print(
                f"error: failed to download {target}: HTTP {exc.code} {exc.reason}",
                file=sys.stderr,
            )
        except urllib.error.URLError as exc:
            failures += 1
            print(f"error: failed to download {target}: {exc.reason}", file=sys.stderr)
        except Exception as exc:
            failures += 1
            print(f"error: {exc}", file=sys.stderr)

    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
