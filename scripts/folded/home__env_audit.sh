#!/bin/bash
set -euo pipefail

mkdir -p audit_out
OUTPUT_FILE="audit_out/env_audit_$(date +%Y%m%d_%H%M%S).txt"

{
  echo "=== SYSTEM INFO ==="
  uname -a
  echo "OS Type: $(uname -o 2>/dev/null || echo unknown)"
  if command -v getprop >/dev/null 2>&1; then
    echo "Android Version: $(getprop ro.build.version.release 2>/dev/null || echo unknown)"
    echo "Device Model: $(getprop ro.product.model 2>/dev/null || echo unknown)"
  fi

  echo
  echo "=== PYTHON INFO ==="
  python3 --version 2>/dev/null || echo "Python 3 not found"
  pip list 2>/dev/null || echo "pip not available"

  echo
  echo "=== PROJECT STRUCTURE ==="
  find . -maxdepth 3 -not -path '*/.*'

  echo
  echo "=== GIT STATUS ==="
  if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    git status --short --branch
    git branch -a
  else
    echo "Not a git repository."
  fi

  echo
  echo "=== STORAGE ==="
  df -h .

  echo
  echo "=== NETWORK INFO ==="
  if command -v ip >/dev/null 2>&1; then
    ip addr show | grep "inet " || true
  elif command -v ifconfig >/dev/null 2>&1; then
    ifconfig | grep "inet " || true
  fi
} > "$OUTPUT_FILE"

echo "Audit complete: $OUTPUT_FILE"
