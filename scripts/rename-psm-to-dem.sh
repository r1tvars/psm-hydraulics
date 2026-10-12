#!/usr/bin/env bash
#
# One-off migration for databases created before the PSM → DEM rebrand.
#
# Renames every "psm"/"PSM"/"Psm" in the database (module psm_site → dem_site,
# theme psmhydraulics → demhydraulics, block ids, settings, content, SKUs,
# file URIs) and the matching uploaded files on disk. Safe to run twice: it
# does nothing when the database no longer references psm_site.
#
# The replacement is a plain text substitution on a dump. "psm" and "dem" have
# the same length, so PHP-serialized string lengths stay valid.
#
#   scripts/rename-psm-to-dem.sh            (containers must be running)

set -euo pipefail
cd "$(dirname "$0")/.."

env_val() { grep -E "^$1=" .env 2>/dev/null | tail -1 | cut -d= -f2-; }
DB_NAME="$(env_val DB_NAME)"; DB_NAME="${DB_NAME:-drupal}"
DB_USER="$(env_val DB_USER)"; DB_USER="${DB_USER:-drupal}"
DB_PASSWORD="$(env_val DB_PASSWORD)"; DB_PASSWORD="${DB_PASSWORD:-drupal}"

sql() { docker compose exec -T db mariadb -u"$DB_USER" -p"$DB_PASSWORD" -N "$DB_NAME" "$@"; }

if [ -z "$(sql -e "SELECT name FROM config WHERE name = 'psm_site.settings'")" ]; then
  echo "✔ Database already uses DEM names — nothing to do."
  exit 0
fi

echo "▶ Renaming PSM → DEM in the database…"
# Cache and search-index rows are regenerable and would collide after the
# rename ("psm" and "dem" can both be indexed words), so ship structure only.
IGNORE_FLAGS=()
while IFS= read -r table; do
  case "$table" in
    cache*|search_index|search_total|search_dataset|watchdog|sessions|semaphore)
      IGNORE_FLAGS+=("--ignore-table=${DB_NAME}.${table}")
      ;;
  esac
done < <(sql -e 'SHOW TABLES')

dump() {
  docker compose exec -T db mariadb-dump -u"$DB_USER" -p"$DB_PASSWORD" \
    --no-tablespaces --single-transaction "$@" "$DB_NAME"
}

# Buffer the whole dump before importing: streaming straight back would
# drop tables before their data had been read.
TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT
{
  dump --no-data
  dump --no-create-info "${IGNORE_FLAGS[@]}"
} | sed 's/psm/dem/g; s/PSM/DEM/g; s/Psm/Dem/g' > "$TMP"
docker compose exec -T db mariadb -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < "$TMP"

echo "▶ Renaming uploaded files…"
# Files are owned by the container user, so rename from inside the app.
docker compose exec -T app sh -c '
  cd /var/www/html/web/sites/default/files 2>/dev/null || exit 0
  find . -depth -name "*[Pp][Ss][Mm]*" -not -path "./styles/*" -not -path "./css/*" -not -path "./js/*" |
  while read -r f; do
    d=$(dirname "$f"); b=$(basename "$f")
    mv "$f" "$d/$(echo "$b" | sed "s/psm/dem/g; s/PSM/DEM/g; s/Psm/Dem/g")"
  done
  rm -rf styles
'

echo "▶ Rebuilding caches and search index…"
docker compose exec -T app drush cache:rebuild
docker compose exec -T app drush php:eval '\Drupal::service("search.index")->markForReindex();' 2>/dev/null || true
# Core search reindexes on cron.
docker compose exec -T app drush cron 2>/dev/null || true

echo "✔ Database renamed to DEM."
