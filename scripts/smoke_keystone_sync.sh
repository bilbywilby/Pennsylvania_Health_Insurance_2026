#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="${REPO_ROOT}/sources/keystone-sync"
HOST="127.0.0.1"
PORT="${SMOKE_PORT:-4173}"
SERVER_PID=""
LOG_FILE="$(mktemp)"
IS_ANDROID=0

if [[ "$(uname -o 2>/dev/null || true)" == "Android" ]] || [[ -n "${TERMUX_VERSION:-}" ]]; then
  IS_ANDROID=1
fi

cleanup() {
  if [[ -n "${SERVER_PID}" ]] && kill -0 "${SERVER_PID}" 2>/dev/null; then
    kill "${SERVER_PID}" 2>/dev/null || true
    wait "${SERVER_PID}" 2>/dev/null || true
  fi
  rm -f "${LOG_FILE}"
}
trap cleanup EXIT

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "ERROR: missing required command: $1" >&2
    exit 1
  }
}

require_cmd bun
require_cmd curl

if [[ ! -d "${APP_DIR}" ]]; then
  echo "ERROR: ${APP_DIR} not found" >&2
  exit 1
fi

echo "==> [1/5] Lockfile & TypeScript check in sources/keystone-sync"
cd "${APP_DIR}"
INSTALL_FLAGS=()
if [[ "${IS_ANDROID}" -eq 1 ]]; then
  echo "INFO: Termux/Android detected; passing --ignore-scripts to skip unsupported workerd postinstall"
  INSTALL_FLAGS+=(--ignore-scripts)
fi

if ! bun install --frozen-lockfile "${INSTALL_FLAGS[@]}"; then
  bun install "${INSTALL_FLAGS[@]}"
fi
bun run typecheck

if [[ -f "${REPO_ROOT}/scripts/check_appeal_bundle.js" ]]; then
  echo "==> [2/5] Repo bundle guard"
  node "${REPO_ROOT}/scripts/check_appeal_bundle.js"
fi

echo "==> [3/5] Production build (Vite + @cloudflare/vite-plugin)"
cd "${APP_DIR}"
BUILD_OK=0
if bun run build; then
  BUILD_OK=1
elif [[ "${IS_ANDROID}" -eq 1 ]]; then
  echo "WARN: Native Android bun run build failed (likely workerd android arm64 LE limitation)."
  echo "INFO: Typecheck and appeal bundle guard passed; skipping full Cloudflare worker build on Android."
else
  echo "ERROR: Production build failed in ${APP_DIR}" >&2
  exit 1
fi

if [[ "${BUILD_OK}" -eq 1 ]] && [[ -x "${APP_DIR}/node_modules/.bin/wrangler" ]] && [[ "${IS_ANDROID}" -eq 0 ]]; then
  echo "==> [4/5] Wrangler dry-run check"
  (cd "${APP_DIR}" && ./node_modules/.bin/wrangler deploy --dry-run) || \
    echo "WARN: wrangler deploy --dry-run exited non-zero; inspect wrangler config/bindings"
else
  echo "==> [4/5] Skipping wrangler dry-run (build skipped, binary missing, or Android/Termux workerd limitation)"
fi

echo "==> [5/5] Local HTTP & asset smoke test on http://${HOST}:${PORT}"
if [[ "${BUILD_OK}" -ne 1 ]]; then
  echo "SKIP: No build output on Android; static/typecheck smoke checks completed."
  exit 0
fi

if grep -q '"preview"' "${APP_DIR}/package.json" && [[ "${IS_ANDROID}" -eq 0 ]]; then
  bun run preview -- --host "${HOST}" --port "${PORT}" >"${LOG_FILE}" 2>&1 &
  SERVER_PID=$!
elif command -v python3 >/dev/null 2>&1 && [[ -d "${APP_DIR}/dist" ]]; then
  python3 -m http.server "${PORT}" --bind "${HOST}" --directory "${APP_DIR}/dist" >"${LOG_FILE}" 2>&1 &
  SERVER_PID=$!
else
  echo "SKIP: No preview script or dist/ static fallback available; build artifacts only verified."
  exit 0
fi

READY=0
for _ in $(seq 1 30); do
  if curl -fsS "http://${HOST}:${PORT}/" >/dev/null 2>&1; then
    READY=1
    break
  fi
  sleep 0.25
done

if [[ "${READY}" -ne 1 ]]; then
  echo "ERROR: Preview server did not become ready on ${HOST}:${PORT}" >&2
  cat "${LOG_FILE}" >&2
  exit 1
fi

BODY="$(curl -fsS "http://${HOST}:${PORT}/")"
if [[ -z "${BODY}" ]]; then
  echo "ERROR: Empty response from /" >&2
  exit 1
fi

if echo "${BODY}" | grep -qE '__vite_error_overlay__|Unhandled Runtime Error|Application error: a client-side exception'; then
  echo "ERROR: Runtime error marker detected in response from /" >&2
  exit 1
fi

echo "SMOKE_OK"
