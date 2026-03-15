# PSM Hydraulics Drupal 11

Drupal 11 project scaffolded for local development with Docker Compose and for production deployment without Docker.

## Included

- Drupal 11 recommended project layout
- Gin admin theme enabled
- Gin Login module enabled
- Tailwind CSS starter kit package
- Custom frontend theme at `web/themes/custom/psmhydraulics`
- Docker Compose services for Traefik, Nginx, PHP-FPM 8.3, MariaDB, and Composer
- Drush installed for container-based Drupal administration

## Local development

1. Review `.env` and adjust values if needed.
2. Add a hosts entry for `psmhydraulics.local` on the machine running your browser:
   `127.0.0.1 psmhydraulics.local`
3. Build and start the stack: `docker compose up -d --build`
4. Open `http://psmhydraulics.local`

Database connection values during Drupal install:

- Host: `db`
- Database: `${DB_NAME}`
- Username: `${DB_USER}`
- Password: `${DB_PASSWORD}`

## Container layout

- `traefik`: local reverse proxy that listens on port `80` and routes `psmhydraulics.local`
- `nginx`: web server serving Drupal from `web/`
- `app`: PHP-FPM container used by Nginx and for Drush commands
- `db`: MariaDB database
- `composer`: Composer-only utility container
- `node`: frontend watcher service for the custom Tailwind theme

Nginx is present because this setup now mirrors the common production split where the web server and PHP runtime are separate services. Traefik sits in front of Nginx and handles the hostname routing.

## Composer workflow

Use the Composer container so package management always runs on PHP 8.3:

```bash
docker compose run --rm composer require drupal/some_module
docker compose run --rm composer update
```

## Drush workflow

Run Drush inside the PHP container:

```bash
docker compose exec app drush status
docker compose exec app drush cr
docker compose exec app drush cex -y
docker compose exec app drush cim -y
```

## Frontend theme workflow

The active frontend theme is `psmhydraulics` in `web/themes/custom/psmhydraulics`.

The Node container starts with the normal stack and runs the Tailwind watcher:

```bash
docker compose up -d --build
```

That service runs:

```bash
npm install && npm run dev
```

For a one-off production-style build:

```bash
docker compose run --rm node sh -lc "npm install && npm run build"
```

If you prefer running Node directly in WSL instead of Docker, the same commands work from:

```bash
web/themes/custom/psmhydraulics
```

## Notes

- This repo is set up for Composer-managed Drupal modules and themes.
- `gin` is the active admin theme and `psmhydraulics` is the active default theme.
- `gin_login` is enabled and uses the current admin theme for the login experience.
- Production can deploy the same codebase without Docker as long as the target service provides compatible PHP, database, and web server configuration.
