# Database Setup

Homecache Commons uses SQLite.

## Local Development

Install dependencies:

```bash
npm install
```

Start the API:

```bash
npm run server
```

By default the database is created at:

```text
server/data/homecache.db
```

## Custom Database Path

Set `DB_PATH` before starting the server:

```bash
DB_PATH=/path/to/homecache.db npm run server
```

On Windows PowerShell:

```powershell
$env:DB_PATH="C:\path\to\homecache.db"
npm run server
```

## Deployment

Use persistent storage for both the database and uploaded files:

```text
DB_PATH=/var/data/homecache.db
UPLOADS_DIR=/var/data/uploads
```

The included `render.yaml` already configures a persistent disk and these paths.
