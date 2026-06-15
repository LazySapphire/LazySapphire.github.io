#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import os
import re
import shutil
import subprocess
import sys
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
    archive_remote: str
    archive_dir: Path
    archive_branch: str
    archive_root: str
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
        help="Validate metadata and print planned actions without downloading LFS objects.",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Refresh the cached copy even if it already matches the expected hash.",
    )
    parser.add_argument(
        "--archive-remote",
        help="Override the configured git remote for the PDF archive.",
    )
    parser.add_argument(
        "--archive-dir",
        help="Override the configured local checkout directory for the PDF archive.",
    )
    parser.add_argument(
        "--archive-branch",
        help="Override the configured branch for the PDF archive checkout.",
    )
    parser.add_argument(
        "--archive-root",
        help="Override the configured root directory inside the PDF archive.",
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

    required = (
        "archive_remote",
        "archive_dir",
        "archive_branch",
        "archive_root",
        "cache_dir",
    )
    missing = [key for key in required if not values.get(key)]
    if missing:
        raise ValueError(
            f"Missing [params.paper_assets] keys in {config_path}: {', '.join(missing)}"
        )

    archive_dir = Path(values["archive_dir"])
    if not archive_dir.is_absolute():
        archive_dir = (REPO_ROOT / archive_dir).resolve()

    cache_dir = Path(values["cache_dir"])
    if not cache_dir.is_absolute():
        cache_dir = (REPO_ROOT / cache_dir).resolve()

    return AssetConfig(
        archive_remote=values["archive_remote"],
        archive_dir=archive_dir,
        archive_branch=values["archive_branch"],
        archive_root=values["archive_root"],
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

    title = front_matter.get("list_title") or front_matter.get("title") or slug

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


def git_env(*, skip_smudge: bool = False) -> dict[str, str]:
    env = os.environ.copy()
    if skip_smudge:
        env["GIT_LFS_SKIP_SMUDGE"] = "1"
    return env


def run_git(
    args: list[str],
    *,
    cwd: Path,
    env: dict[str, str] | None = None,
    capture_output: bool = False,
) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["git", *args],
        cwd=cwd,
        env=env,
        check=True,
        text=True,
        capture_output=capture_output,
    )


def ensure_git_lfs_available() -> None:
    try:
        subprocess.run(
            ["git", "lfs", "version"],
            check=True,
            text=True,
            capture_output=True,
        )
    except (FileNotFoundError, subprocess.CalledProcessError) as exc:
        raise FileNotFoundError(
            "git-lfs is required for paper PDF maintenance. Install it on this machine first."
        ) from exc


def destination_path(config: AssetConfig, note: PaperNote) -> Path:
    return config.cache_dir / note.asset_name


def archive_checkout_exists(config: AssetConfig) -> bool:
    return (config.archive_dir / ".git").exists()


def archive_pdf_path(config: AssetConfig, note: PaperNote) -> Path:
    return config.archive_dir / config.archive_root.strip("/") / note.asset_name


def archive_is_dirty(config: AssetConfig) -> bool:
    result = run_git(
        ["status", "--porcelain"],
        cwd=config.archive_dir,
        capture_output=True,
    )
    return bool(result.stdout.strip())


def ensure_archive_checkout(config: AssetConfig) -> None:
    if archive_checkout_exists(config):
        return

    config.archive_dir.parent.mkdir(parents=True, exist_ok=True)
    if config.archive_dir.exists() and any(config.archive_dir.iterdir()):
        raise FileExistsError(
            f"Archive directory exists but is not a git checkout: {config.archive_dir}"
        )

    run_git(
        [
            "clone",
            "--depth=1",
            "--branch",
            config.archive_branch,
            config.archive_remote,
            str(config.archive_dir),
        ],
        cwd=REPO_ROOT,
        env=git_env(skip_smudge=True),
    )


def sync_archive_checkout(config: AssetConfig) -> None:
    if archive_is_dirty(config):
        raise RuntimeError(
            f"Archive checkout is dirty: {config.archive_dir}. "
            "Commit/stash local changes before using remote sync."
        )

    run_git(
        ["fetch", "origin", config.archive_branch, "--depth=1"],
        cwd=config.archive_dir,
        env=git_env(skip_smudge=True),
    )
    run_git(
        ["checkout", config.archive_branch],
        cwd=config.archive_dir,
        env=git_env(skip_smudge=True),
    )
    run_git(
        ["reset", "--hard", "FETCH_HEAD"],
        cwd=config.archive_dir,
        env=git_env(skip_smudge=True),
    )


def lfs_pull_pdf(config: AssetConfig, note: PaperNote) -> Path:
    ensure_git_lfs_available()
    ensure_archive_checkout(config)
    sync_archive_checkout(config)

    run_git(
        ["lfs", "install", "--local"],
        cwd=config.archive_dir,
    )
    run_git(
        [
            "lfs",
            "pull",
            "origin",
            "--include",
            f"{config.archive_root.strip('/')}/{note.asset_name}",
        ],
        cwd=config.archive_dir,
    )

    pdf_path = archive_pdf_path(config, note)
    if not pdf_path.is_file():
        raise FileNotFoundError(
            f"Missing PDF after LFS pull: {pdf_path}. "
            "Confirm the file exists in pdf-archive and has been pushed."
        )
    return pdf_path


def cached_archive_pdf_if_valid(config: AssetConfig, note: PaperNote) -> Path | None:
    pdf_path = archive_pdf_path(config, note)
    if not pdf_path.is_file():
        return None
    if sha256sum(pdf_path) == note.sha256:
        return pdf_path
    return None


def fetch_one(note: PaperNote, config: AssetConfig, *, dry_run: bool, force: bool) -> None:
    destination = destination_path(config, note)
    archive_pdf = archive_pdf_path(config, note)

    if dry_run:
        print(f"[dry-run] {note.slug} -> {destination} <- {archive_pdf}")
        return

    if destination.exists() and not force:
        current_sha = sha256sum(destination)
        if current_sha == note.sha256:
            print(f"[cached] {note.slug} -> {destination}")
            return
        print(
            f"[stale-cache] {note.slug} cached hash {current_sha} != expected {note.sha256}",
            file=sys.stderr,
        )

    local_archive_pdf = cached_archive_pdf_if_valid(config, note)
    if local_archive_pdf is not None:
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(local_archive_pdf, destination)
        print(f"[local-archive] {note.slug} -> {destination}")
        return

    source_pdf = lfs_pull_pdf(config, note)
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source_pdf, destination)

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

    if args.archive_remote:
        config = AssetConfig(
            archive_remote=args.archive_remote,
            archive_dir=config.archive_dir,
            archive_branch=config.archive_branch,
            archive_root=config.archive_root,
            cache_dir=config.cache_dir,
        )
    if args.archive_dir:
        config = AssetConfig(
            archive_remote=config.archive_remote,
            archive_dir=Path(args.archive_dir).expanduser().resolve(),
            archive_branch=config.archive_branch,
            archive_root=config.archive_root,
            cache_dir=config.cache_dir,
        )
    if args.archive_branch:
        config = AssetConfig(
            archive_remote=config.archive_remote,
            archive_dir=config.archive_dir,
            archive_branch=args.archive_branch,
            archive_root=config.archive_root,
            cache_dir=config.cache_dir,
        )
    if args.archive_root:
        config = AssetConfig(
            archive_remote=config.archive_remote,
            archive_dir=config.archive_dir,
            archive_branch=config.archive_branch,
            archive_root=args.archive_root,
            cache_dir=config.cache_dir,
        )
    if args.cache_dir:
        cache_dir = Path(args.cache_dir).expanduser()
        if not cache_dir.is_absolute():
            cache_dir = (REPO_ROOT / cache_dir).resolve()
        config = AssetConfig(
            archive_remote=config.archive_remote,
            archive_dir=config.archive_dir,
            archive_branch=config.archive_branch,
            archive_root=config.archive_root,
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
        except Exception as exc:
            failures += 1
            print(f"error: {exc}", file=sys.stderr)

    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
