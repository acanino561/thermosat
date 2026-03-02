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

## License Management

Verixos on-premise requires a valid license. License validation is **fully local** — no internet connection is required at any point. The license is a signed JWT verified with an embedded public key.

### Initial Setup

Set your license key using **one** of these methods (checked in priority order):

1. **Environment variable** — set `VERIXOS_LICENSE_KEY` in your `.env` or `docker-compose.yml`:
   ```bash
   VERIXOS_LICENSE_KEY=eyJhbGciOiJSUzI1NiIs...
   ```

2. **System-level file** — place your `.vxlic` file at:
   - Linux: `/etc/verixos/license.vxlic`
   - Windows: `C:\ProgramData\Verixos\license.vxlic`

3. **Local file** — place `license.vxlic` in the application's working directory

### Admin UI

Organization owners can manage the license from **Dashboard → Admin → License**:

- View current license status (org, tier, seats, expiry)
- Upload a new `.vxlic` file (applies immediately, persists until restart)
- Download a renewal request file (`.vxlr`)

### Annual Renewal

1. Go to **Admin → License** in the dashboard
2. Click **Download Renewal Request** to generate a `.vxlr` file
3. Email the `.vxlr` file to `licensing@verixos.com`
4. You'll receive a new `.vxlic` license file
5. Upload it via the Admin UI, or replace the file at `/etc/verixos/license.vxlic`
6. For persistence across restarts, update `VERIXOS_LICENSE_KEY` in your `.env` file

### Air-Gapped Environments

No special configuration needed. License validation uses RSA signature verification against an embedded public key — **no network calls are made**. The renewal request file (`.vxlr`) contains only your org name, seat count, and a machine fingerprint (no private data). Transfer it via USB, email, or any other means.

---

## Keeping Verixos Updated

### Checking for Updates

Organization owners can check for new versions from **Dashboard → Admin → Updates**. The update checker contacts `updates.verixos.com` to compare your installed version against the latest release.

### Update Procedure

1. Go to **Admin → Updates** and click **Take DB Snapshot** to back up your database
2. Click **Check for Updates** to see if a newer version is available
3. If an update is available, run the provided command on your Docker host:
   ```bash
   docker compose pull && docker compose up -d
   ```
4. Verify the new version in the Admin → Updates page after restart

### Air-Gapped Environments

If your instance cannot reach the internet, check [hub.docker.com/r/verixos/app](https://hub.docker.com/r/verixos/app) for the latest image tags. Pull the image on a machine with internet access, export it with `docker save`, transfer it to your server, and load it with `docker load`.

### Database Snapshots

The **Take DB Snapshot** button runs `pg_dump` and saves a `.sql` file to `/tmp/` on the server. For production deployments, we recommend also setting up automated backups via `pg_dump` cron jobs or your cloud provider's snapshot feature.
