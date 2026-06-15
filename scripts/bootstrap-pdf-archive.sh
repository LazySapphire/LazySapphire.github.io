#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
archive_dir="${1:-$repo_root/../pdf-archive}"
archive_remote="${2:-git@github.com:LazySapphire/pdf-archive.git}"
archive_branch="${3:-main}"

if ! command -v git >/dev/null 2>&1; then
  echo "git is required" >&2
  exit 1
fi

if ! git lfs version >/dev/null 2>&1; then
  echo "git-lfs is required before bootstrapping pdf-archive" >&2
  exit 1
fi

if [[ -e "$archive_dir/.git" ]]; then
  echo "Archive checkout already exists: $archive_dir"
  exit 0
fi

mkdir -p "$(dirname "$archive_dir")"
GIT_LFS_SKIP_SMUDGE=1 git clone --depth=1 --branch "$archive_branch" "$archive_remote" "$archive_dir"
git -C "$archive_dir" lfs install --local

echo "Bootstrapped pdf-archive at: $archive_dir"
