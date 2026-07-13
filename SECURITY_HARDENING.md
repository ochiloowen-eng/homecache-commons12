# Security Hardening

This document summarizes the production-readiness security changes in Homecache Commons.

## Implemented

- Centralized password validation in `server/security.js`.
- Passwords require at least 8 characters with uppercase, lowercase, and numbers.
- New account passwords are stored with PBKDF2 hashes.
- Legacy SHA-256 password hashes are accepted on login and rehashed automatically.
- Known demo account credentials are removed during database initialization.
- Login and recovery endpoints have in-memory rate limiting.
- Password recovery tokens are no longer returned to clients by default.
- Recovery email delivery uses SMTP settings when configured.
- Uploaded files are served through authenticated API download endpoints.
- Browser file previews and downloads include bearer-token authorization.
- Basic security headers are applied to API responses.
- CORS is restricted to `APP_BASE_URL`.

## Environment

Required for deployed frontend/backend linkage:

```text
APP_BASE_URL=https://your-frontend-domain
REACT_APP_API_URL=https://your-api-domain
```

Optional for invite and recovery email delivery:

```text
SMTP_HOST=smtp.yourprovider.com
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password
SMTP_FROM="Homecache <no-reply@yourdomain.com>"
```

Optional local-only recovery debugging:

```text
ENABLE_DEV_RECOVERY_TOKENS=true
```

Do not enable development recovery tokens in production.

## Tests

Run the API/security checks:

```bash
npm test
```

Run the production build:

```bash
npm run build
```

Run the browser smoke test after a build:

```bash
npm run test:browser
```

## Remaining Production Work

- Move rate limiting to Redis or another shared store for multi-instance deployments.
- Review Content Security Policy for the final production domains and asset needs.
- Add structured audit logging for account, invite, recovery, and file access events.
- Schedule regular dependency updates and `npm audit` review.
