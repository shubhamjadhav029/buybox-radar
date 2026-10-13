# BuyBox Radar — Deployment Guide

This guide covers local development setup, containerized deployment, and deploying to **Microsoft Azure**.

---

## 1. Local Development Quickstart

### Prerequisites
- Node.js ≥ 20.x
- Docker & Docker Compose (for local PostgreSQL)

### Step-by-Step Setup
```bash
# 1. Clone repository & install dependencies
git clone <repo-url>
cd buybox-radar
npm install

# 2. Start PostgreSQL container
docker compose up -d db

# 3. Configure environment
cp server/.env.example server/.env

# 4. Run migrations and seed synthetic dataset
npm run db:migrate -w server
npm run seed:generate -w server
npm run db:seed -w server

# 5. Launch both API (:4000) and Web UI (:5173) concurrently
npm run dev
```

Visit `http://localhost:5173` to explore the application.

---

## 2. Docker Production Deployment

BuyBox Radar is packaged as a single multi-stage Docker image that serves the API on port 8080 and static frontend assets:

```bash
# Build production image
docker build -t buybox-radar:latest .

# Run container with external PostgreSQL
docker run -d \
  --name buybox-radar \
  -p 8080:8080 \
  -e DATABASE_URL="postgresql://radar:radar@host.docker.internal:5432/radar?schema=public" \
  -e SEED_ON_BOOT="true" \
  buybox-radar:latest
```

Or using Docker Compose with the full profile:
```bash
docker compose --profile full up --build
```

---

## 3. Azure Cloud Deployment

The application runs as a Linux container on **Azure App Service (B1)** connected to **Azure Database for PostgreSQL Flexible Server**:

```bash
# Set configuration variables
RG="rg-buybox-radar"
LOC="centralindia"
SUFFIX=$RANDOM
ACR="radaracr$SUFFIX"
PG="radar-pg-$SUFFIX"
APP="buybox-radar-$SUFFIX"
PLAN="plan-buybox-radar"
PGPASS="RadarSecret2026Secure"

# Log in and create Resource Group
az login
az group create --name $RG --location $LOC

# 1. Create Azure Database for PostgreSQL (Flexible Server)
az postgres flexible-server create \
  --resource-group $RG \
  --name $PG \
  --location $LOC \
  --tier Burstable \
  --sku-name Standard_B1ms \
  --storage-size 32 \
  --version 16 \
  --admin-user radaradmin \
  --admin-password "$PGPASS" \
  --public-access 0.0.0.0 \
  --yes

# 2. Create Azure Container Registry and build image in the cloud
az acr create --resource-group $RG --name $ACR --sku Basic --admin-enabled true
az acr build --registry $ACR --image buybox-radar:latest .

# 3. Create App Service Plan (Linux B1) and Web App
az appservice plan create --resource-group $RG --name $PLAN --is-linux --sku B1
az webapp create \
  --resource-group $RG \
  --plan $PLAN \
  --name $APP \
  --container-image-name "$ACR.azurecr.io/buybox-radar:latest" \
  --container-registry-url "https://$ACR.azurecr.io" \
  --container-registry-user $(az acr credential show --name $ACR --query username -o tsv) \
  --container-registry-password $(az acr credential show --name $ACR --query "passwords[0].value" -o tsv)

# 4. Configure App Settings
az webapp config appsettings set --resource-group $RG --name $APP --settings \
  WEBSITES_PORT=8080 \
  NODE_ENV=production \
  SEED_ON_BOOT=true \
  CORS_ORIGIN="https://$APP.azurewebsites.net" \
  DATABASE_URL="postgresql://radaradmin:$PGPASS@$PG.postgres.database.azure.com:5432/flexibleserverdb?sslmode=require&schema=public"

# 5. Restart web app and inspect startup logs
az webapp restart --resource-group $RG --name $APP
az webapp log tail --resource-group $RG --name $APP

echo "App URL: https://$APP.azurewebsites.net"
```

### Clean Up After Evaluation
```bash
az group delete --name $RG --yes
```

---

## 4. Environment Variables Reference

| Variable | Default (Dev) | Production (Azure) | Description |
|----------|---------------|--------------------|-------------|
| `NODE_ENV` | `development` | `production` | Node environment |
| `PORT` | `4000` | `8080` | Port Express listens on |
| `DATABASE_URL` | `postgresql://radar:radar@localhost:5432/radar?schema=public` | Azure Postgres URI | PostgreSQL connection string |
| `CORS_ORIGIN` | `http://localhost:5173` | Azure Web App URL | Allowed CORS origin |
| `LOG_LEVEL` | `info` | `info` | Pino log level |
| `CACHE_TTL_SECONDS` | `600` | `600` | LRU cache time-to-live |
| `CACHE_MAX_ENTRIES` | `100` | `100` | Maximum queries stored in LRU cache |
| `WEB_DIST_DIR` | `""` | `/app/web-dist` | Path to static SPA build (served by Express) |
| `SEED_FILE` | `./prisma/seed-data/companies.json` | Same | Path to raw synthetic dataset |
| `SEED_ON_BOOT` | `false` | `true` | When true, populates database on first start |

---

## 5. Troubleshooting & FAQ

- **Port Conflict on 5432**: If local Postgres is already running, either stop it or adjust the host port mapping in `docker-compose.yml` (e.g., `5433:5432`).
- **Prisma SSL Connection in Cloud**: Azure Postgres requires SSL. Ensure `?sslmode=require` is present at the end of the `DATABASE_URL`.
- **Database Seed Not Executing**: Ensure `SEED_ON_BOOT="true"` is set. The seed script is idempotent and checks `--if-empty` to avoid overwriting live user data.
