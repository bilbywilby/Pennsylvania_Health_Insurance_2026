#!/usr/bin/env bash
set -euo pipefail

TARGET_DIR="${1:-$HOME/tech-ref-portal}"

if [ ! -d "$TARGET_DIR" ]; then
    echo "[-] Error: Directory $TARGET_DIR does not exist."
    exit 1
fi

cd "$TARGET_DIR"

echo "=== [1/4] Repository Root Verification ==="
printf 'Repo root: '
git rev-parse --show-toplevel

echo "=== [2/4] Working Tree Status & Branch Tracking ==="
git status --short --branch
git branch -vv

echo "=== [3/4] Remote Origin Verification ==="
if git show-ref --verify --quiet refs/remotes/origin/main; then
    echo "[+] origin/main exists locally."
else
    echo "[!] origin/main is not fetched. Fetching remote..."
    git fetch origin main || echo "[-] Warning: Could not fetch from origin."
fi

echo "=== [4/4] Workspace Directory Listing ==="
ls -la
