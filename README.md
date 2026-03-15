# PSM Hydraulics Drupal 11

Drupal 11 project scaffolded for local development with Docker Compose and for production deployment without Docker.

## Included

- Drupal 11 recommended project layout
- Gin admin theme
- Gin Login theme
- Tailwind CSS starter kit package
- Docker Compose services for Apache/PHP 8.3, MariaDB, and Composer

## Local development

1. Copy `.env.example` to `.env`.
2. Update `UID` and `GID` if your WSL user differs from `1000`.
3. Build the containers: `docker compose build`
4. Install Composer dependencies: `docker compose run --rm composer install`
5. Start the stack: `docker compose up -d`
6. Open `http://localhost:8080`

Database connection values during Drupal install:

- Host: `db`
- Database: `${DB_NAME}`
- Username: `${DB_USER}`
- Password: `${DB_PASSWORD}`

## Composer workflow

Use the Composer container so package management always runs on PHP 8.3:

```bash
docker compose run --rm composer require drupal/some_module
docker compose run --rm composer update
```

## Notes

- This repo is set up for Composer-managed Drupal modules and themes.
- The Tailwind CSS starter kit is installed as a package; generating and building a custom Tailwind theme is the next step after the base site is up.
- Production can deploy the same codebase without Docker as long as the target service provides compatible PHP, database, and web server configuration.
