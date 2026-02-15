#!/usr/bin/env bash
set -euo pipefail

for file in render.yaml backend/render.yaml; do
  if [[ -f "$file" ]]; then
    echo "[check] found $file"
  else
    echo "[check] missing $file"
  fi
done

if [[ -f render.yaml ]]; then
  rg "moltbot|routes|MOLTBOT_URL|AGENT_PROVIDER" render.yaml >/dev/null
  echo "[check] render.yaml contains moltbot migration markers"
fi
