#!/usr/bin/env bash
set -euo pipefail

interval="${BACKUP_INTERVAL_SECONDS:-300}"
retention_days="${BACKUP_RETENTION_DAYS:-30}"

mkdir -p /backups/sql /backups/files

while true; do
  ts="$(date +%Y%m%d-%H%M%S)"
  echo "[backup] running backup at ${ts}"

  export PGPASSWORD="${POSTGRES_PASSWORD:-}"
  pg_dump \
    -h "${POSTGRES_HOST:-postgres}" \
    -U "${POSTGRES_USER:-clawbot}" \
    -d "${POSTGRES_DB:-clawbot}" \
    > "/backups/sql/clawbot-${ts}.sql"

  tar -czf "/backups/files/volumes-${ts}.tar.gz" /data || true

  find /backups -type f -mtime +"${retention_days}" -delete
  sleep "${interval}"
done
