# Homecache Commons

Homecache Commons is a React + Express + SQLite app for preserving family memories.

## Stack

- React 18 (Create React App)
- Express API server
- SQLite database (`server/data/homecache.db` by default)

## Run Locally

1. Install dependencies:

```bash
npm install
```

2. Start the backend API:

```bash
npm run server
```

3. In a second terminal, start the frontend:

```bash
npm start
```

Or start both together:

```bash
npm run dev
```

- Frontend: http://localhost:3000
- Backend: http://localhost:4000

## What Is Interactive Now

- Data is loaded from API endpoints instead of static arrays.
- "Add Memory" saves into SQLite and updates dashboard + timeline.
- Memories can be edited and deleted from the timeline.
- Files can be uploaded as memory attachments and downloaded from each memory.
- Search filters memories from backend data.
- Settings toggles persist in the database.

## Key Paths

- `server/index.js` API routes
- `server/db.js` schema + seed/init logic
- `src/api.js` frontend API client
- `src/App.js` data loading + state orchestration
- `src/pages/Pages.js` interactive pages
- `src/components/UI.js` interactive modal

## Invite Email Notifications

Invites can send an email notification when `invitedContact` is an email address.

Set these environment variables before starting the backend:

```bash
APP_BASE_URL=http://localhost:3000
SMTP_HOST=smtp.yourprovider.com
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password
SMTP_FROM="Homecache <no-reply@yourdomain.com>"
```

Then run:

```bash
npm run server
```

Notes:
- If SMTP is not configured, invite creation still works but no email is sent.
- If `nodemailer` is not installed, install it with `npm install nodemailer`.

## GitHub + Vercel + Render wiring

This repo is already linked to GitHub and includes deployment manifests for both Vercel and Render.

### 1. Push to GitHub

1. Ensure your repo is pushed to GitHub and the remote is named `origin`.
2. Vercel and Render can both import the same repository from GitHub.

### 2. Deploy the backend on Render

1. In Render, create a new **Web Service** from this repository.
2. Render will auto-detect [render.yaml](render.yaml).
3. Set these environment variables in Render:
   - `APP_BASE_URL=https://<your-vercel-domain>`
   - `ALLOWED_ORIGINS=https://<your-vercel-domain>`
   - `DB_PATH=/var/data/homecache.db`
   - `UPLOADS_DIR=/var/data/uploads`
4. Deploy the service and note the backend URL, for example `https://homecache-api.onrender.com`.

### 3. Deploy the frontend on Vercel

1. Import the same GitHub repository into Vercel.
2. Vercel should auto-detect Create React App from [vercel.json](vercel.json).
3. Set this environment variable in Vercel:
   - `REACT_APP_API_URL=https://<your-render-backend-domain>`
4. Deploy and note the frontend URL, for example `https://homecache.vercel.app`.

### 4. Final link-up

1. Set Render `APP_BASE_URL` to the real Vercel frontend URL.
2. Set Render `ALLOWED_ORIGINS` to the same Vercel frontend URL (and any preview URLs if needed).
3. Redeploy Render once so the backend accepts the frontend origin.
4. Open the Vercel URL and log in or register.
