# PSM Hydraulics Drupal 11

Drupal 11 project scaffolded for local development with Docker Compose and for production deployment without Docker.

## Included

- Drupal 11 recommended project layout
- Gin admin theme
- Gin Login theme
- Tailwind CSS starter kit package
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
docker compose exec app vendor/bin/drush status
docker compose exec app vendor/bin/drush cr
docker compose exec app vendor/bin/drush cex -y
docker compose exec app vendor/bin/drush cim -y
```

## Notes

- This repo is set up for Composer-managed Drupal modules and themes.
- The Tailwind CSS starter kit is installed as a package; generating and building a custom Tailwind theme is the next step after the base site is up.
- Production can deploy the same codebase without Docker as long as the target service provides compatible PHP, database, and web server configuration.
