#!/usr/bin/env bash
#
# PSM Hydraulics — one-command local setup.
#
#   ./start.sh          start (and update) the site
#   ./start.sh --fresh  reset the database + files back to the demo seed
#
# Requirements: Docker Desktop (or docker + compose v2) and git.

set -euo pipefail
cd "$(dirname "$0")"

SITE_URL="http://psmhydraulics.local"

say()  { printf '\n\033[1;33m▶ %s\033[0m\n' "$*"; }
ok()   { printf '\033[0;32m✔ %s\033[0m\n' "$*"; }
warn() { printf '\033[0;35m⚠ %s\033[0m\n' "$*"; }
fail() { printf '\n\033[0;31m✘ %s\033[0m\n' "$*"; exit 1; }

FRESH=0
if [ "${1:-}" = "--fresh" ]; then
  FRESH=1
fi

# ── Docker available and running? ─────────────────────────────────────
command -v docker >/dev/null 2>&1 \
  || fail "Docker is not installed. Install Docker Desktop first: https://docs.docker.com/get-docker/"
docker info >/dev/null 2>&1 \
  || fail "Docker is not running. Start Docker Desktop, wait until it says it's running, then run this script again."
docker compose version >/dev/null 2>&1 \
  || fail "Docker Compose v2 is missing. Update Docker Desktop."

# ── Local .env ────────────────────────────────────────────────────────
if [ ! -f .env ]; then
  cp .env.example .env
  ok "Created .env from .env.example"
fi

# .env cannot be sourced directly (it sets the readonly UID variable).
env_val() { grep -E "^$1=" .env 2>/dev/null | tail -1 | cut -d= -f2-; }
PROJECT="$(env_val COMPOSE_PROJECT_NAME)"; PROJECT="${PROJECT:-psm-hydraulics}"

# ── Latest code ───────────────────────────────────────────────────────
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  say "Updating code"
  if git pull --ff-only 2>/dev/null; then
    ok "Code is up to date"
  else
    warn "Could not pull latest code (offline or local changes) — continuing with what's here."
  fi
fi

# ── Hosts entry ───────────────────────────────────────────────────────
if ! grep -qE '(^|\s)psmhydraulics\.local(\s|$)' /etc/hosts; then
  say "Adding psmhydraulics.local to /etc/hosts (may ask for your computer password)"
  if echo "127.0.0.1 psmhydraulics.local" | sudo tee -a /etc/hosts >/dev/null; then
    ok "Hosts entry added"
  else
    warn "Could not edit /etc/hosts — add this line yourself: 127.0.0.1 psmhydraulics.local"
  fi
fi
if grep -qi microsoft /proc/version 2>/dev/null; then
  warn "You appear to be on WSL: also make sure the Windows hosts file"
  warn "(C:\\Windows\\System32\\drivers\\etc\\hosts) contains: 127.0.0.1 psmhydraulics.local"
  warn "(Notepad must be run as Administrator to edit it.)"
fi

# ── Fresh reset? ──────────────────────────────────────────────────────
if [ "$FRESH" = "1" ]; then
  echo ""
  read -r -p "This DELETES your local database and uploaded files, and restores the demo content. Continue? [y/N] " answer
  case "$answer" in
    [Yy]*) ;;
    *) echo "Cancelled."; exit 0 ;;
  esac
  say "Removing old database and files"
  # Uploaded files are owned by the container user — delete from inside.
  docker compose run --rm --no-deps app rm -rf /var/www/html/web/sites/default/files 2>/dev/null \
    || rm -rf web/sites/default/files 2>/dev/null \
    || true
  docker compose down -v
fi

# ── Start containers ──────────────────────────────────────────────────
say "Starting containers (first run can take a few minutes)"
docker compose up -d --build --quiet-pull 2>&1 | grep -viE 'running|started|built$' || true
ok "Containers running"

# ── Wait for the database ─────────────────────────────────────────────
say "Waiting for the database"
tries=0
until [ "$(docker inspect -f '{{.State.Health.Status}}' "${PROJECT}-db" 2>/dev/null)" = "healthy" ]; do
  tries=$((tries + 1))
  [ "$tries" -gt 60 ] && fail "Database did not start within 2 minutes. Try: docker compose logs db"
  sleep 2
done
ok "Database is up"

# ── PHP dependencies ──────────────────────────────────────────────────
say "Installing PHP dependencies"
docker compose exec -T app composer install --no-interaction --no-progress 2>&1 | tail -1 || true

# ── Seed the database on first run ────────────────────────────────────
if ! docker compose exec -T app drush status --field=bootstrap 2>/dev/null | grep -qi successful; then
  [ -f scripts/seed/seed.sql.gz ] || fail "scripts/seed/seed.sql.gz is missing — pull the latest code."
  say "Setting up the database with demo content"
  docker compose exec -T app sh -c "gunzip -c /var/www/html/scripts/seed/seed.sql.gz | drush sql:cli"
  ok "Database restored from seed"
fi

if [ ! -d web/sites/default/files ] && [ -f scripts/seed/files.tar.gz ]; then
  say "Restoring uploaded files"
  tar -xzf scripts/seed/files.tar.gz -C web/sites/default
  # Drupal (container user) must be able to write here.
  docker compose exec -T app chown -R www-data:www-data /var/www/html/web/sites/default/files
  ok "Files restored"
fi

# ── Updates: database, config, caches ─────────────────────────────────
say "Applying updates"
docker compose exec -T app drush updb -y 2>&1 | tail -1
docker compose exec -T app drush config:import -y 2>&1 | tail -1
docker compose exec -T app drush cache:rebuild 2>&1 | tail -1
ok "Site is up to date"

# ── Done ──────────────────────────────────────────────────────────────
echo ""
ok "All done! The site is running at: ${SITE_URL}"
say "Log in as administrator with this one-time link (valid once):"
docker compose exec -T app drush user:login --uri="${SITE_URL}" 2>/dev/null || true
echo ""
echo "Tips:"
echo "  • Re-run ./start.sh any time — it updates code and the site safely."
echo "  • Broke something while experimenting? ./start.sh --fresh resets to demo content."
