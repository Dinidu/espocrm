# EspoCRM Data Sync Scripts

Scripts for exporting and importing Reports and Workflows between EspoCRM instances.

**Note:** These scripts use admin user/password authentication (required for workflow access - API keys don't have workflow permissions).

## Setup

### 1. Create `.env` file in `data/scripts/`

```bash
# data/scripts/.env

# ===========================================
# PRODUCTION ENVIRONMENT
# ===========================================
ESPO_PROD_URL=https://your-production-url.com
ESPO_PROD_USER=admin
ESPO_PROD_PASSWORD=your-admin-password

# ===========================================
# DEVELOPMENT ENVIRONMENT  
# ===========================================
ESPO_DEV_URL=http://localhost:8080
ESPO_DEV_USER=admin
ESPO_DEV_PASSWORD=admin123
```

## Usage

### Using Environment Presets (Recommended)

```bash
# Export from production
node data/scripts/export-reports.js --env=prod
node data/scripts/export-workflows.js --env=prod

# Import to dev
node data/scripts/import-reports.js --env=dev
node data/scripts/import-workflows.js --env=dev
```

### Using Direct Arguments

```bash
node data/scripts/export-reports.js \
  --url=https://your-espocrm.com \
  --user=admin \
  --password=your-password
```

## Folder Structure

```
data/
├── reports/           # Exported report JSON files
│   ├── _manifest.json # Export manifest (auto-generated)
│   └── *.json         # Individual report files
├── workflows/         # Exported workflow JSON files
│   ├── _manifest.json # Export manifest (auto-generated)
│   └── *.json         # Individual workflow files
└── scripts/           # Import/Export scripts
    ├── .env           # Your environment config (not in git)
    ├── export-reports.js
    ├── import-reports.js
    ├── export-workflows.js
    ├── import-workflows.js
    └── README.md
```

## Docker Compose Integration

The `docker-compose.yml` includes a `espocrm-data-importer` service that automatically imports reports and workflows when containers start.

### Environment Variables for Docker

The importer uses these variables from your `.env`:
- `ADMIN_USER` - Admin username (default: admin)
- `ADMIN_PASSWORD` - Admin password (default: admin123)

### Trigger Import Manually

```bash
docker compose up espocrm-data-importer
```

## Workflow: Dev → Production

### Initial Setup (One-time)

1. **Export from Production**:
   ```bash
   node data/scripts/export-reports.js --env=prod
   node data/scripts/export-workflows.js --env=prod
   ```

2. **Commit to Git**:
   ```bash
   git add data/reports/ data/workflows/
   git commit -m "Initial sync: reports and workflows from production"
   ```

### Development Cycle

1. **Import to Dev** (after git pull):
   ```bash
   node data/scripts/import-reports.js --env=dev
   node data/scripts/import-workflows.js --env=dev
   ```

2. **Make changes** in EspoCRM UI

3. **Export from Dev**:
   ```bash
   node data/scripts/export-reports.js --env=dev
   node data/scripts/export-workflows.js --env=dev
   ```

4. **Commit and Push**:
   ```bash
   git add data/reports/ data/workflows/
   git commit -m "Updated reports/workflows"
   git push
   ```

5. **Deploy to Production**:
   ```bash
   node data/scripts/import-reports.js --env=prod
   node data/scripts/import-workflows.js --env=prod
   ```

## Environment Variables Reference

| Variable | Description |
|----------|-------------|
| `ESPO_PROD_URL` | Production EspoCRM URL |
| `ESPO_PROD_USER` | Production admin username |
| `ESPO_PROD_PASSWORD` | Production admin password |
| `ESPO_DEV_URL` | Development EspoCRM URL |
| `ESPO_DEV_USER` | Development admin username |
| `ESPO_DEV_PASSWORD` | Development admin password |

## CLI Arguments Reference

| Argument | Description |
|----------|-------------|
| `--env=prod` | Use production settings from .env |
| `--env=dev` | Use dev settings from .env |
| `--url=URL` | EspoCRM URL |
| `--user=USER` | Admin username |
| `--password=PASS` | Admin password |

## Notes

- **IDs are preserved**: Reports/workflows keep their original IDs across environments
- **Upsert logic**: Existing entities are updated, new ones are created
- **System fields excluded**: `createdAt`, `modifiedAt`, `createdById` etc. are not synced
- **Manifests**: `_manifest.json` files are for reference only and not imported
- **Admin auth required**: User/password auth is required for workflow access (API keys don't work)
