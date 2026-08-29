#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
exec bun scripts/build-wasm.ts
