#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

CONFIG="config/season.example.json"
SIGNER_URL="http://localhost:8787/sign"
THEME="themes/fantasy.v1.json"
OUT=""
CERT_OUT=""
FLAVOR_OUT=""
QUIET=0
USE_OPENAI=0
OPENAI_MODEL="gpt-image-1"
OPENAI_SIZE="1024x1024"
OPENAI_KEY=""
QR_CODE=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --config) CONFIG="$2"; shift 2 ;;
    --signer-url) SIGNER_URL="$2"; shift 2 ;;
    --theme) THEME="$2"; shift 2 ;;
    --cert-out) CERT_OUT="$2"; shift 2 ;;
    --flavor-out) FLAVOR_OUT="$2"; shift 2 ;;
    --out) OUT="$2"; shift 2 ;;
    --quiet) QUIET=1; shift ;;
    --use-openai) USE_OPENAI=1; shift ;;
    --openai-model) OPENAI_MODEL="$2"; shift 2 ;;
    --openai-size) OPENAI_SIZE="$2"; shift 2 ;;
    --openai-key) OPENAI_KEY="$2"; shift 2 ;;
    --qr-code) QR_CODE=1; shift ;;
    --) shift; break ;;
    *) echo "Unknown option: $1" >&2; exit 2 ;;
  esac
done

cd "$REPO_ROOT"

# Defaults for intermediate outputs
if [[ -z "$CERT_OUT" ]]; then
  ts="$(date +%s)"
  CERT_OUT="certs/${ts}.json"
fi
if [[ -z "$FLAVOR_OUT" ]]; then
  base_name="$(basename "$CERT_OUT")"
  FLAVOR_OUT="flavors/${base_name}"
fi

# Ensure directories exist
mkdir -p "$(dirname "$CERT_OUT")" "$(dirname "$FLAVOR_OUT")"

node dist/miner/cli.js --config "$CONFIG" --signer-url "$SIGNER_URL" ${QUIET:+--quiet} --out "$CERT_OUT"

node dist/flavorer/cli.js --cert "$CERT_OUT" --theme "$THEME" --out "$FLAVOR_OUT"

RENDER_ARGS=(--in "$FLAVOR_OUT")
[[ "$QR_CODE" -eq 1 ]] && RENDER_ARGS+=(--cert "$CERT_OUT")
if [[ "$USE_OPENAI" -eq 1 ]]; then
  RENDER_ARGS+=(--use-openai)
  [[ -n "$OPENAI_MODEL" ]] && RENDER_ARGS+=(--openai-model "$OPENAI_MODEL")
  [[ -n "$OPENAI_SIZE" ]] && RENDER_ARGS+=(--openai-size "$OPENAI_SIZE")
  [[ -n "$OPENAI_KEY" ]] && RENDER_ARGS+=(--openai-key "$OPENAI_KEY")
fi

if [[ "$OUT" == "stdout" ]]; then
  node dist/renderer/cli.js "${RENDER_ARGS[@]}"
else
 # handle if out not set or '-' or not valid path and default to 'cards/<same-basename-as-cert>.svg'
  if [[ -z "$OUT" || "$OUT" == "-" || ! -d "$(dirname "$OUT")" ]]; then
    OUT="cards/$(basename "$CERT_OUT" .json).svg"
  fi
  node dist/renderer/cli.js "${RENDER_ARGS[@]}" --out "$OUT"
fi


