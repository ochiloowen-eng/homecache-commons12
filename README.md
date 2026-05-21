# Homecache Commons

Homecache Commons is a React + Express + SQLite app for preserving family memories.

## Stack

- React 18 (Create React App)
- Express API server
- SQLite database (`server/data/homecache.db`)

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

## Make It Public (Render + Vercel)

This repo is prepared for public deployment.

### 1. Deploy API on Render

1. Push this repo to GitHub.
2. In Render, create a new **Web Service** from your repo.
3. Render can auto-detect `render.yaml`.
4. Ensure these env vars are set:
   - `APP_BASE_URL=https://<your-vercel-domain>`
   - `DB_PATH=/var/data/homecache.db`
   - `UPLOADS_DIR=/var/data/uploads`
5. Attach the persistent disk (defined in `render.yaml`) so DB/files survive restarts.
6. After deploy, note backend URL, e.g. `https://homecache-api.onrender.com`.

### 2. Deploy Frontend on Vercel

1. Import the same repo into Vercel.
2. Framework: Create React App (auto).
3. Add env var:
   - `REACT_APP_API_URL=https://<your-render-backend-domain>`
4. Deploy and note frontend URL, e.g. `https://homecache.vercel.app`.

### 3. Final Link-Up

1. Update Render `APP_BASE_URL` to your real Vercel URL.
2. Redeploy Render once.
3. Open frontend URL from any device and log in/register.
