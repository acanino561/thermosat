# Self-Hosting Verixos

Run Verixos on your own infrastructure with Docker.

## Prerequisites

- Docker 24+
- Docker Compose v2
- 2GB+ RAM recommended

## Quick Start

```bash
# 1. Configure environment
cp .env.docker.example .env
nano .env  # Set passwords and API keys

# 2. Start all services
docker compose up -d

# 3. Open http://localhost:3000
```

Verixos will automatically run database migrations on first start.

## First Run

1. Navigate to `http://localhost:3000`
2. Create your account via the sign-up page
3. The first registered user becomes the admin

## Updating

```bash
docker compose down
docker compose build --no-cache
docker compose up -d
```

## Backup & Restore

```bash
# Backup database
docker exec verixos-db pg_dump -U verixos verixos > backup.sql

# Restore database
cat backup.sql | docker exec -i verixos-db psql -U verixos verixos
```

## Services

| Service | Port | Description |
|---------|------|-------------|
| verixos-app | 3000 | Main application |
| verixos-db | 5432 (internal) | PostgreSQL database |
| verixos-storage | 9000 / 9001 | MinIO (S3-compatible storage / console) |

## Troubleshooting

**Port 3000 already in use:**
Change the host port in `docker-compose.yml`: `"8080:3000"`

**Database connection errors:**
Ensure `verixos-db` is healthy: `docker compose ps`

**Out of memory:**
MinIO + Postgres + Next.js needs ~1.5GB minimum. Increase Docker's memory limit.

**Logs:**
```bash
docker compose logs -f verixos-app
docker compose logs -f verixos-db
```
