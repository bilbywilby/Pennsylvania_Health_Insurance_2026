#!/usr/bin/env bash
# Keystone repo sync: run by hand or from a scheduler.
set -euo pipefail
umask 077

REPO_URL="https://github.com/bilbywilby/Keystone_Health_downloadable_files.git"
TARGET_DIR="${TARGET_DIR:-$HOME/Keystone_Health_downloadable_files}"
STATE_DIR="${STATE_DIR:-$HOME/.local/state/keystone_bootstrap}"
LOG_FILE="$STATE_DIR/bootstrap.log"
BACKUP_DIR="$STATE_DIR/backups"
LOCK_FILE="$STATE_DIR/bootstrap.lock"
KEEP_BUNDLES="${KEEP_BUNDLES:-7}"

# Git must never discover a stray ~/.git, and must never wait on a prompt
export GIT_CEILING_DIRECTORIES="$HOME"
export GIT_TERMINAL_PROMPT=0

mkdir -p -- "$STATE_DIR" "$BACKUP_DIR"
chmod 700 -- "$STATE_DIR" "$BACKUP_DIR"

# Rotate by size; never truncate history
if [ -f "$LOG_FILE" ] && [ "$(wc -c < "$LOG_FILE")" -gt 524288 ]; then
  mv -f -- "$LOG_FILE" "$LOG_FILE.1"
fi
: >> "$LOG_FILE"
chmod 600 -- "$LOG_FILE"

stamp() { date -Iseconds; }
log()  { printf '[%s] [INFO] %s\n'  "$(stamp)" "$*" | tee -a "$LOG_FILE"; }
warn() { printf '[%s] [WARN] %s\n'  "$(stamp)" "$*" | tee -a "$LOG_FILE" >&2; }
die()  { printf '[%s] [ERROR] %s\n' "$(stamp)" "$*" | tee -a "$LOG_FILE" >&2; exit 1; }

retry() {  # retry <tries> <delay> <cmd...>  (returns 1 when exhausted)
  local tries=$1 delay=$2 i; shift 2
  for ((i = 1; i <= tries; i++)); do
    if "$@"; then return 0; fi
    warn "'$*' failed ($i/$tries)"
    if [ "$i" -lt "$tries" ]; then sleep "$delay"; fi
  done
  return 1
}

ensure_pkg() {  # ensure_pkg <command> <termux-package>
  if command -v "$1" >/dev/null 2>&1; then return 0; fi
  command -v pkg >/dev/null 2>&1 || die "'$1' missing and pkg unavailable"
  log "Installing $2..."
  retry 3 5 pkg update -y || die "pkg update failed after 3 attempts"
  retry 3 5 pkg install -y "$2" || die "pkg install $2 failed after 3 attempts"
}

ensure_pkg git git
ensure_pkg flock util-linux

exec 200>"$LOCK_FILE"
if ! flock -n 200; then
  warn "Another run holds the lock; exiting."
  exit 75
fi

if [ -d "$TARGET_DIR/.git" ]; then
  # Bundle BEFORE mutating, outside the worktree
  bundle="$BACKUP_DIR/keystone_$(date +%Y%m%d_%H%M%S).bundle"
  log "Backing up to $bundle"
  git -C "$TARGET_DIR" bundle create -q "$bundle" --all || die "bundle create failed"
  git -C "$TARGET_DIR" bundle verify -q "$bundle" || die "bundle verify failed"
  ls -1t "$BACKUP_DIR"/keystone_*.bundle | tail -n "+$((KEEP_BUNDLES + 1))" \
    | xargs -r rm -f -- || true
  log "Pulling (ff-only)..."
  git -C "$TARGET_DIR" pull --ff-only 2>&1 | tee -a "$LOG_FILE" \
    || die "pull failed: network, diverged history, or local changes"
else
  if [ -e "$TARGET_DIR" ] && [ -n "$(ls -A "$TARGET_DIR" 2>/dev/null)" ]; then
    die "$TARGET_DIR exists, is non-empty, and is not a git repo"
  fi
  log "Cloning $REPO_URL"
  git clone "$REPO_URL" "$TARGET_DIR" 2>&1 | tee -a "$LOG_FILE" || die "clone failed"
fi
[ -d "$TARGET_DIR/.git" ] || die "no .git in $TARGET_DIR after sync"
log "HEAD: $(git -C "$TARGET_DIR" rev-parse --short HEAD)"

# No chmod sweep: umask 077 already yields 600/700 and preserves git's exec bits

if [ -f "$TARGET_DIR/requirements.txt" ]; then
  ensure_pkg python3 python
  if [ ! -d "$TARGET_DIR/.venv" ]; then
    python3 -m venv "$TARGET_DIR/.venv"
    printf '.venv/\n' >> "$TARGET_DIR/.git/info/exclude"
  fi
  "$TARGET_DIR/.venv/bin/pip" install -q -r "$TARGET_DIR/requirements.txt"
fi
log "Done."
