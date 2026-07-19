#!/usr/bin/env bash
#
# Regenerates the demo seed used by start.sh for fresh setups:
#   scripts/seed/seed.sql.gz  — database dump (content + config)
#   scripts/seed/files.tar.gz — uploaded files (without regenerable caches)
#
# Run this from a machine with a working, running site whenever you want
# the "fresh install" baseline to match the current state. Commit the
# resulting files.

set -euo pipefail
cd "$(dirname "$0")/.."

# .env cannot be sourced directly (it sets the readonly UID variable).
env_val() { grep -E "^$1=" .env 2>/dev/null | tail -1 | cut -d= -f2-; }
DB_NAME="$(env_val DB_NAME)"; DB_NAME="${DB_NAME:-drupal}"
DB_USER="$(env_val DB_USER)"; DB_USER="${DB_USER:-drupal}"
DB_PASSWORD="$(env_val DB_PASSWORD)"; DB_PASSWORD="${DB_PASSWORD:-drupal}"

mkdir -p scripts/seed

echo "▶ Dumping database…"
# Cache/log/queue tables ship structure-only to keep the seed small.
IGNORE_FLAGS=()
while IFS= read -r table; do
  case "$table" in
    cache*|watchdog|flood|batch|queue|sessions|semaphore)
      IGNORE_FLAGS+=("--ignore-table=${DB_NAME}.${table}")
      ;;
  esac
done < <(docker compose exec -T db mariadb -u"$DB_USER" -p"$DB_PASSWORD" -N -e 'SHOW TABLES' "$DB_NAME")

{
  docker compose exec -T db mariadb-dump -u"$DB_USER" -p"$DB_PASSWORD" \
    --no-tablespaces --single-transaction --no-data "$DB_NAME"
  docker compose exec -T db mariadb-dump -u"$DB_USER" -p"$DB_PASSWORD" \
    --no-tablespaces --single-transaction --no-create-info "${IGNORE_FLAGS[@]}" "$DB_NAME"
} | gzip > scripts/seed/seed.sql.gz

echo "▶ Archiving uploaded files…"
tar -czf scripts/seed/files.tar.gz \
  --exclude='files/css' \
  --exclude='files/js' \
  --exclude='files/styles' \
  --exclude='files/php' \
  -C web/sites/default files

echo "✔ Seed written:"
ls -lh scripts/seed/
echo "Commit scripts/seed/ to make it available to others."
