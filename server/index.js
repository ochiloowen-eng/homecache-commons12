const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { all, get, run, initDb } = require("./db");
const {
  SECURITY_CONFIG,
  createRateLimitMiddleware,
  resetRateLimit,
  validatePassword,
} = require("./security");
let nodemailer = null;
try {
  // Optional dependency. If unavailable, invite flow still works without email delivery.
  // eslint-disable-next-line global-require
  nodemailer = require("nodemailer");
} catch (_error) {
  nodemailer = null;
}

const app = express();
const port = Number(process.env.PORT || 4000);
const host = process.env.HOST || "0.0.0.0";
const APP_BASE_URL = process.env.APP_BASE_URL || "http://localhost:3000";
const allowedOrigins = new Set(
  [
    APP_BASE_URL,
    "http://localhost:3000",
    "http://localhost:4000",
    "https://localhost:3000",
    "https://localhost:4000",
  ].filter(Boolean)
);
for (const extraOrigin of (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean)) {
  allowedOrigins.add(extraOrigin);
}
const allowedOriginPatterns = [
  /^https:\/\/.*\.vercel\.app$/i,
  /^https:\/\/.*\.vercel\.dev$/i,
  /^https:\/\/localhost(:\d+)?$/i,
  /^http:\/\/localhost(:\d+)?$/i,
];
function isOriginAllowed(origin) {
  if (!origin) {
    return true;
  }
  if (allowedOrigins.has(origin)) {
    return true;
  }
  return allowedOriginPatterns.some((pattern) => pattern.test(origin));
}

const startupPromise = initDb();

const uploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}-${safeName}`);
  },
});
const upload = multer({ storage });

app.use(cors({
  origin(origin, callback) {
    if (!origin || APP_BASE_URL === "*" || isOriginAllowed(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error("Origin not allowed"));
  },
}));

// Security headers
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  res.setHeader("Content-Security-Policy", "default-src 'self'");
  next();
});

app.use(express.json());

// Rate limiting on auth endpoints
const loginRateLimit = createRateLimitMiddleware(
  "login",
  SECURITY_CONFIG.RATE_LIMIT_LOGIN,
  SECURITY_CONFIG.RATE_LIMIT_WINDOW
);
const recoveryRateLimit = createRateLimitMiddleware(
  "recovery",
  SECURITY_CONFIG.RATE_LIMIT_RECOVERY,
  SECURITY_CONFIG.RATE_LIMIT_WINDOW
);

app.get("/", (_req, res) => {
  res.type("html").send(`
    <!doctype html>
    <html>
      <head><meta charset="utf-8"><title>Homecache API</title></head>
      <body style="font-family: Arial, sans-serif; padding: 24px;">
        <h2>Homecache API is running</h2>
        <p>Frontend app: <a href="http://localhost:3000">http://localhost:3000</a></p>
        <p>API health: <a href="/api/health">/api/health</a></p>
      </body>
    </html>
  `);
});


const SESSION_TTL_DAYS = 14;
const RECOVERY_TTL_MINUTES = 30;
const INVITE_DEFAULT_DAYS = 7;
const VALID_ROLES = new Set(["owner", "parent", "member", "guest"]);
const PASSWORD_HASH_ITERATIONS = 210000;
const PASSWORD_HASH_KEYLEN = 32;
const PASSWORD_HASH_DIGEST = "sha256";
const notificationStreams = new Map();

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(String(password), salt, PASSWORD_HASH_ITERATIONS, PASSWORD_HASH_KEYLEN, PASSWORD_HASH_DIGEST)
    .toString("hex");
  return `pbkdf2$${PASSWORD_HASH_ITERATIONS}$${salt}$${hash}`;
}

function legacyHashPassword(password) {
  return crypto.createHash("sha256").update(String(password)).digest("hex");
}

function verifyPassword(password, storedHash) {
  const value = String(storedHash || "");
  const parts = value.split("$");
  if (parts.length === 4 && parts[0] === "pbkdf2") {
    const iterations = Number(parts[1]);
    const salt = parts[2];
    const expected = Buffer.from(parts[3], "hex");
    const actual = crypto.pbkdf2Sync(String(password), salt, iterations, expected.length, PASSWORD_HASH_DIGEST);
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
  }
  return value === legacyHashPassword(password);
}

function needsPasswordRehash(storedHash) {
  return !String(storedHash || "").startsWith("pbkdf2$");
}

function randomToken() {
  return crypto.randomBytes(24).toString("hex");
}

function plusDays(days) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

function plusMinutes(minutes) {
  return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}

function normalizeIdentifier(value) {
  return String(value || "").trim().toLowerCase();
}

function isEmail(value) {
  const candidate = String(value || "").trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate);
}

async function sendInviteEmail({ to, householdName, inviterName, role, code, expiresAt }) {
  if (!nodemailer) {
    return { sent: false, reason: "nodemailer_not_installed" };
  }
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 0);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM;

  if (!host || !port || !user || !pass || !from) {
    return { sent: false, reason: "smtp_not_configured" };
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  const inviteUrl = `${APP_BASE_URL}/?inviteCode=${encodeURIComponent(code)}`;
  const expiresDate = new Date(expiresAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
  const subject = `${inviterName} invited you to join ${householdName} on Homecache`;
  const text = [
    `You have been invited to join "${householdName}" as ${role}.`,
    "",
    `Invite code: ${code}`,
    `Use this link: ${inviteUrl}`,
    `Expires: ${expiresDate}`,
  ].join("\n");

  await transporter.sendMail({
    from,
    to,
    subject,
    text,
    html: `
      <p>You have been invited to join <strong>${householdName}</strong> as <strong>${role}</strong>.</p>
      <p><strong>Invite code:</strong> ${code}</p>
      <p><a href="${inviteUrl}">Accept invite</a></p>
      <p>Expires: ${expiresDate}</p>
    `,
  });

  return { sent: true, reason: "sent", inviteUrl };
}

async function sendRecoveryEmail({ to, displayName, token, expiresAt }) {
  if (!nodemailer || !isEmail(to)) {
    return { sent: false };
  }
  const host = process.env.SMTP_HOST;
  const smtpPort = Number(process.env.SMTP_PORT || 0);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM;

  if (!host || !smtpPort || !user || !pass || !from) {
    return { sent: false };
  }

  const transporter = nodemailer.createTransport({
    host,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: { user, pass },
  });

  const expiresDate = new Date(expiresAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
  await transporter.sendMail({
    from,
    to,
    subject: "Reset your Homecache password",
    text: [
      `Hi ${displayName || "there"},`,
      "",
      `Use this recovery token to reset your Homecache password: ${token}`,
      `Expires: ${expiresDate}`,
      "",
      "If you did not request this, you can ignore this message.",
    ].join("\n"),
  });

  return { sent: true };
}

async function getSessionFromRequest(req) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice("Bearer ".length).trim() : "";
  return getSessionFromToken(token);
}

async function getSessionFromToken(token) {
  if (!token) {
    return null;
  }

  const session = await get(
    `SELECT s.id, s.token, s.expiresAt, a.id as accountId, a.displayName, a.identifier
     FROM auth_sessions s
     JOIN accounts a ON a.id = s.accountId
     WHERE s.token = ?`,
    [token]
  );
  if (!session) {
    return null;
  }
  if (new Date(session.expiresAt).getTime() < Date.now()) {
    await run("DELETE FROM auth_sessions WHERE id = ?", [session.id]);
    return null;
  }

  const membership = await get(
    `SELECT hm.role, hm.householdId, h.name as householdName
     FROM household_memberships hm
     JOIN households h ON h.id = hm.householdId
     WHERE hm.accountId = ? AND hm.status = 'active'
     LIMIT 1`,
    [session.accountId]
  );

  if (!membership) {
    return null;
  }

  return {
    token: session.token,
    account: {
      id: session.accountId,
      displayName: session.displayName,
      identifier: session.identifier,
    },
    membership,
  };
}

function addNotificationStream(householdId, res) {
  const list = notificationStreams.get(householdId) || [];
  list.push(res);
  notificationStreams.set(householdId, list);
}

function removeNotificationStream(householdId, res) {
  const list = notificationStreams.get(householdId) || [];
  const next = list.filter((stream) => stream !== res);
  if (!next.length) {
    notificationStreams.delete(householdId);
    return;
  }
  notificationStreams.set(householdId, next);
}

function pushNotification(householdId, notification) {
  const listeners = notificationStreams.get(householdId) || [];
  const payload = `event: notification\ndata: ${JSON.stringify(notification)}\n\n`;
  listeners.forEach((stream) => stream.write(payload));
}

async function createNotification(householdId, text, timeLabel = "Just now") {
  const insert = await run(
    "INSERT INTO notifications (householdId, text, timeLabel) VALUES (?, ?, ?)",
    [householdId, text, timeLabel]
  );
  const notification = { id: insert.lastID, text, time: timeLabel };
  pushNotification(householdId, notification);
  return notification;
}

async function requireAuth(req, res, next) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    req.auth = session;
    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    const role = req.auth?.membership?.role;
    // Owner has full rights across the application.
    if (role === "owner") {
      next();
      return;
    }
    if (!roles.includes(role)) {
      res.status(403).json({ error: "Insufficient role permissions" });
      return;
    }
    next();
  };
}
function computeTimeLabel(createdAt) {
  const createdMs = new Date(createdAt).getTime();
  const nowMs = Date.now();
  const dayDiff = Math.floor((nowMs - createdMs) / (1000 * 60 * 60 * 24));
  if (dayDiff <= 0) {
    return "Today";
  }
  if (dayDiff === 1) {
    return "Yesterday";
  }
  return `${dayDiff} days ago`;
}

async function attachFiles(memories) {
  if (!memories.length) {
    return memories;
  }

  const ids = memories.map((m) => m.id);
  const placeholders = ids.map(() => "?").join(",");
  const rows = await all(
    `SELECT id, memoryId, originalName, storedName, mimeType, size, createdAt
     FROM memory_files
     WHERE memoryId IN (${placeholders})
     ORDER BY id DESC`,
    ids
  );

  const grouped = rows.reduce((acc, row) => {
    if (!acc[row.memoryId]) {
      acc[row.memoryId] = [];
    }
    acc[row.memoryId].push({
      id: row.id,
      name: row.originalName,
      mimeType: row.mimeType,
      size: row.size,
      createdAt: row.createdAt,
      url: `/api/memories/${row.memoryId}/files/${row.id}/download`,
    });
    return acc;
  }, {});

  return memories.map((memory) => ({
    ...memory,
    files: grouped[memory.id] || [],
  }));
}

function formatMemory(row) {
  return {
    id: row.id,
    author: row.author,
    emoji: row.emoji,
    color: row.color,
    title: row.title,
    text: row.text,
    tags: row.tags ? JSON.parse(row.tags) : [],
    time: computeTimeLabel(row.createdAt),
    vaultId: row.vaultId,
    vaultName: row.vaultName || "General",
    createdAt: row.createdAt,
  };
}

function formatMemoryRevision(row) {
  return {
    id: row.id,
    memoryId: row.memoryId,
    editedBy: row.editedBy,
    eventType: row.eventType,
    title: row.title,
    text: row.text,
    tags: row.tags ? JSON.parse(row.tags) : [],
    vaultId: row.vaultId,
    vaultName: row.vaultName || "General",
    createdAt: row.createdAt,
  };
}

async function getMemoryOr404(id, householdId, res) {
  const row = await get(
    `SELECT m.*, v.name as vaultName
     FROM memories m
     LEFT JOIN vaults v ON v.id = m.vaultId
     WHERE m.id = ? AND m.householdId = ?`,
    [id, householdId]
  );

  if (!row) {
    res.status(404).json({ error: "Memory not found" });
    return null;
  }

  return row;
}

app.post("/api/auth/register", async (req, res) => {
  try {
    const displayName = String(req.body.displayName || "").trim();
    const identifier = normalizeIdentifier(req.body.identifier);
    const password = String(req.body.password || "");
    const inviteCode = String(req.body.inviteCode || "").trim();
    const householdName = String(req.body.householdName || "").trim();

    if (!displayName || !identifier) {
      res.status(400).json({ error: "displayName and identifier are required" });
      return;
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      res.status(400).json({ error: passwordValidation.reason });
      return;
    }

    const existing = await get("SELECT id FROM accounts WHERE identifier = ?", [identifier]);
    if (existing) {
      res.status(409).json({ error: "Account already exists" });
      return;
    }

    let householdId;
    let role = "owner";

    if (inviteCode) {
      const invite = await get(
        `SELECT * FROM household_invites
         WHERE code = ? AND status = 'pending'`,
        [inviteCode]
      );
      if (!invite) {
        res.status(400).json({ error: "Invalid invite code" });
        return;
      }
      if (new Date(invite.expiresAt).getTime() < Date.now()) {
        res.status(400).json({ error: "Invite code expired" });
        return;
      }
      householdId = invite.householdId;
      role = invite.role;
    } else {
      const name = householdName || `${displayName}'s Household`;
      const household = await run("INSERT INTO households (name) VALUES (?)", [name]);
      householdId = household.lastID;
      role = "owner";
    }

    const created = await run(
      "INSERT INTO accounts (displayName, identifier, passwordHash) VALUES (?, ?, ?)",
      [displayName, identifier, hashPassword(password)]
    );

    await run(
      "INSERT INTO household_memberships (householdId, accountId, role, status) VALUES (?, ?, ?, 'active')",
      [householdId, created.lastID, role]
    );

    if (inviteCode) {
      await run(
        "UPDATE household_invites SET status = 'accepted', usedByAccountId = ? WHERE code = ?",
        [created.lastID, inviteCode]
      );
    }

    const token = randomToken();
    await run(
      "INSERT INTO auth_sessions (accountId, token, expiresAt) VALUES (?, ?, ?)",
      [created.lastID, token, plusDays(SESSION_TTL_DAYS)]
    );

    const membership = await get(
      `SELECT hm.role, hm.householdId, h.name as householdName
       FROM household_memberships hm
       JOIN households h ON h.id = hm.householdId
       WHERE hm.accountId = ?
       LIMIT 1`,
      [created.lastID]
    );

    res.status(201).json({
      token,
      user: {
        id: created.lastID,
        displayName,
        identifier,
        role: membership.role,
        householdId: membership.householdId,
        householdName: membership.householdName,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/auth/login", loginRateLimit, async (req, res) => {
  try {
    const identifier = normalizeIdentifier(req.body.identifier);
    const password = String(req.body.password || "");
    if (!identifier || !password) {
      res.status(400).json({ error: "identifier and password are required" });
      return;
    }

    const account = await get(
      `SELECT id, displayName, identifier, passwordHash
       FROM accounts WHERE identifier = ?`,
      [identifier]
    );
    if (!account || !verifyPassword(password, account.passwordHash)) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    if (needsPasswordRehash(account.passwordHash)) {
      await run("UPDATE accounts SET passwordHash = ? WHERE id = ?", [hashPassword(password), account.id]);
    }

    const membership = await get(
      `SELECT hm.role, hm.householdId, h.name as householdName
       FROM household_memberships hm
       JOIN households h ON h.id = hm.householdId
       WHERE hm.accountId = ? AND hm.status = 'active'
       LIMIT 1`,
      [account.id]
    );
    if (!membership) {
      res.status(403).json({ error: "No active household membership" });
      return;
    }

    const token = randomToken();
    await run(
      "INSERT INTO auth_sessions (accountId, token, expiresAt) VALUES (?, ?, ?)",
      [account.id, token, plusDays(SESSION_TTL_DAYS)]
    );

    res.json({
      token,
      user: {
        id: account.id,
        displayName: account.displayName,
        identifier: account.identifier,
        role: membership.role,
        householdId: membership.householdId,
        householdName: membership.householdName,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/auth/logout", requireAuth, async (req, res) => {
  try {
    await run("DELETE FROM auth_sessions WHERE token = ?", [req.auth.token]);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/auth/me", requireAuth, async (req, res) => {
  res.json({
    user: {
      id: req.auth.account.id,
      displayName: req.auth.account.displayName,
      identifier: req.auth.account.identifier,
      role: req.auth.membership.role,
      householdId: req.auth.membership.householdId,
      householdName: req.auth.membership.householdName,
    },
  });
});

app.get("/api/household/members", requireAuth, async (req, res) => {
  try {
    const rows = await all(
      `SELECT a.id, a.displayName, a.identifier, hm.role, hm.status, hm.createdAt
       FROM household_memberships hm
       JOIN accounts a ON a.id = hm.accountId
       WHERE hm.householdId = ?
       ORDER BY hm.id`,
      [req.auth.membership.householdId]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/household/members", requireAuth, requireRole("owner"), async (req, res) => {
  try {
    const displayName = String(req.body.displayName || "").trim();
    const identifier = normalizeIdentifier(req.body.identifier);
    const password = String(req.body.password || "");
    const role = String(req.body.role || "member").toLowerCase();
    const householdId = req.auth.membership.householdId;

    if (!displayName || !identifier) {
      res.status(400).json({ error: "displayName and identifier are required" });
      return;
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      res.status(400).json({ error: passwordValidation.reason });
      return;
    }

    if (!["parent", "member", "guest"].includes(role)) {
      res.status(400).json({ error: "Role must be parent/member/guest" });
      return;
    }

    const existing = await get("SELECT id FROM accounts WHERE identifier = ?", [identifier]);
    if (existing) {
      res.status(409).json({ error: "Account with this identifier already exists" });
      return;
    }

    const created = await run(
      "INSERT INTO accounts (displayName, identifier, passwordHash) VALUES (?, ?, ?)",
      [displayName, identifier, hashPassword(password)]
    );

    await run(
      "INSERT INTO household_memberships (householdId, accountId, role, status) VALUES (?, ?, ?, 'active')",
      [householdId, created.lastID, role]
    );

    const initials = displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join("") || "M";
    const palette = ["#6A8CAF", "#C77D5B", "#6F9D65", "#8C6FAF", "#4A6B8A"];
    const color = palette[created.lastID % palette.length];

    await run(
      `INSERT INTO members (householdId, name, initials, role, color, online, memories, vaults, joined)
       VALUES (?, ?, ?, ?, ?, 0, 0, 0, ?)`,
      [householdId, displayName, initials, role, color, new Date().toISOString().slice(0, 10)]
    );

    const member = await get(
      `SELECT a.id, a.displayName, a.identifier, hm.role, hm.status, hm.createdAt
       FROM household_memberships hm
       JOIN accounts a ON a.id = hm.accountId
       WHERE hm.householdId = ? AND hm.accountId = ?`,
      [householdId, created.lastID]
    );

    res.status(201).json(member);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch("/api/household/members/:accountId", requireAuth, requireRole("owner"), async (req, res) => {
  try {
    const targetAccountId = Number(req.params.accountId);
    const { role, status } = req.body || {};
    const nextRole = role ? String(role).toLowerCase() : null;
    const nextStatus = status ? String(status).toLowerCase() : null;

    if (!targetAccountId) {
      res.status(400).json({ error: "Invalid accountId" });
      return;
    }
    if (!nextRole && !nextStatus) {
      res.status(400).json({ error: "Provide role or status to update" });
      return;
    }
    if (nextRole && (!VALID_ROLES.has(nextRole) || nextRole === "owner")) {
      res.status(400).json({ error: "Role must be parent/member/guest" });
      return;
    }
    if (nextStatus && !["active", "inactive"].includes(nextStatus)) {
      res.status(400).json({ error: "Status must be active or inactive" });
      return;
    }

    const membership = await get(
      `SELECT hm.*, a.displayName
       FROM household_memberships hm
       JOIN accounts a ON a.id = hm.accountId
       WHERE hm.householdId = ? AND hm.accountId = ?`,
      [req.auth.membership.householdId, targetAccountId]
    );
    if (!membership) {
      res.status(404).json({ error: "Member not found in this household" });
      return;
    }
    if (targetAccountId === req.auth.account.id && nextStatus === "inactive") {
      res.status(400).json({ error: "You cannot deactivate your own owner account" });
      return;
    }
    if (membership.role === "owner") {
      res.status(400).json({ error: "Owner role cannot be changed here" });
      return;
    }

    const updates = [];
    const params = [];
    if (nextRole) {
      updates.push("role = ?");
      params.push(nextRole);
    }
    if (nextStatus) {
      updates.push("status = ?");
      params.push(nextStatus);
    }
    params.push(req.auth.membership.householdId, targetAccountId);

    await run(
      `UPDATE household_memberships
       SET ${updates.join(", ")}
       WHERE householdId = ? AND accountId = ?`,
      params
    );

    const updated = await get(
      `SELECT a.id, a.displayName, a.identifier, hm.role, hm.status, hm.createdAt
       FROM household_memberships hm
       JOIN accounts a ON a.id = hm.accountId
       WHERE hm.householdId = ? AND hm.accountId = ?`,
      [req.auth.membership.householdId, targetAccountId]
    );
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/household/members/:accountId", requireAuth, requireRole("owner"), async (req, res) => {
  try {
    const targetAccountId = Number(req.params.accountId);
    if (!targetAccountId) {
      res.status(400).json({ error: "Invalid accountId" });
      return;
    }
    if (targetAccountId === req.auth.account.id) {
      res.status(400).json({ error: "You cannot remove your own owner account" });
      return;
    }

    const membership = await get(
      `SELECT hm.*, a.displayName
       FROM household_memberships hm
       JOIN accounts a ON a.id = hm.accountId
       WHERE hm.householdId = ? AND hm.accountId = ?`,
      [req.auth.membership.householdId, targetAccountId]
    );
    if (!membership) {
      res.status(404).json({ error: "Member not found in this household" });
      return;
    }
    if (membership.role === "owner") {
      res.status(400).json({ error: "Owner cannot be removed" });
      return;
    }

    await run(
      "DELETE FROM household_memberships WHERE householdId = ? AND accountId = ?",
      [req.auth.membership.householdId, targetAccountId]
    );
    await run(
      "DELETE FROM members WHERE householdId = ? AND LOWER(name) = LOWER(?)",
      [req.auth.membership.householdId, membership.displayName]
    );
    await run("DELETE FROM auth_sessions WHERE accountId = ?", [targetAccountId]);

    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/household/reset", requireAuth, requireRole("owner"), async (req, res) => {
  try {
    const householdId = req.auth.membership.householdId;
    const ownerAccountId = req.auth.account.id;

    const memoryIds = await all("SELECT id FROM memories WHERE householdId = ?", [householdId]);
    for (const row of memoryIds) {
      const files = await all("SELECT storedName FROM memory_files WHERE memoryId = ?", [row.id]);
      for (const file of files) {
        const filePath = path.join(uploadsDir, file.storedName);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
      await run("DELETE FROM memory_files WHERE memoryId = ?", [row.id]);
    }

    await run(
      `DELETE FROM memory_revisions
       WHERE memoryId IN (SELECT id FROM memories WHERE householdId = ?)`,
      [householdId]
    );
    await run("DELETE FROM memories WHERE householdId = ?", [householdId]);
    await run("DELETE FROM notifications WHERE householdId = ?", [householdId]);
    await run("DELETE FROM tree_edges WHERE householdId = ?", [householdId]);
    await run("DELETE FROM tree_nodes WHERE householdId = ?", [householdId]);
    await run("DELETE FROM settings WHERE householdId = ?", [householdId]);
    await run("DELETE FROM vaults WHERE householdId = ?", [householdId]);
    await run("DELETE FROM members WHERE householdId = ?", [householdId]);
    await run("DELETE FROM household_invites WHERE householdId = ?", [householdId]);

    const memberRows = await all(
      `SELECT accountId
       FROM household_memberships
       WHERE householdId = ? AND accountId != ?`,
      [householdId, ownerAccountId]
    );
    const memberAccountIds = memberRows.map((row) => row.accountId);

    await run(
      "DELETE FROM household_memberships WHERE householdId = ? AND accountId != ?",
      [householdId, ownerAccountId]
    );

    for (const accountId of memberAccountIds) {
      const stillUsed = await get("SELECT COUNT(*) as count FROM household_memberships WHERE accountId = ?", [accountId]);
      if ((stillUsed?.count || 0) === 0) {
        await run("DELETE FROM auth_sessions WHERE accountId = ?", [accountId]);
        await run("DELETE FROM account_recovery_tokens WHERE accountId = ?", [accountId]);
        await run("DELETE FROM accounts WHERE id = ?", [accountId]);
      }
    }

    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/household/invites", requireAuth, requireRole("owner", "parent"), async (req, res) => {
  try {
    const role = String(req.body.role || "member").toLowerCase();
    const invitedContact = String(req.body.invitedContact || "").trim();
    const expiresInDays = Number(req.body.expiresInDays || INVITE_DEFAULT_DAYS);

    if (!VALID_ROLES.has(role) || role === "owner") {
      res.status(400).json({ error: "Role must be parent/member/guest" });
      return;
    }

    const code = `HC-${randomToken().slice(0, 10).toUpperCase()}`;
    const expiresAt = plusDays(Math.max(1, Math.min(30, expiresInDays)));

    const created = await run(
      `INSERT INTO household_invites (householdId, code, role, createdByAccountId, invitedContact, expiresAt)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [req.auth.membership.householdId, code, role, req.auth.account.id, invitedContact || null, expiresAt]
    );

    const invite = await get("SELECT * FROM household_invites WHERE id = ?", [created.lastID]);
    let emailNotification = { sent: false, reason: "not_requested" };
    if (isEmail(invitedContact)) {
      const householdName = req.auth.membership.householdName || "your household";
      const inviterName = req.auth.account.displayName || "A household admin";
      try {
        emailNotification = await sendInviteEmail({
          to: invitedContact,
          householdName,
          inviterName,
          role,
          code,
          expiresAt,
        });
      } catch (error) {
        emailNotification = { sent: false, reason: "send_failed", message: error.message };
      }
    }

    res.status(201).json({ ...invite, emailNotification });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/household/invites", requireAuth, requireRole("owner", "parent"), async (req, res) => {
  try {
    const rows = await all(
      `SELECT hi.*, a.displayName as createdBy
       FROM household_invites hi
       JOIN accounts a ON a.id = hi.createdByAccountId
       WHERE hi.householdId = ?
       ORDER BY hi.id DESC`,
      [req.auth.membership.householdId]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/auth/recovery/request", recoveryRateLimit, async (req, res) => {
  try {
    const identifier = normalizeIdentifier(req.body.identifier);
    if (!identifier) {
      res.status(400).json({ error: "identifier is required" });
      return;
    }

    const account = await get("SELECT id, displayName, identifier FROM accounts WHERE identifier = ?", [identifier]);
    if (!account) {
      res.json({ ok: true, message: "If this account exists, recovery instructions were created." });
      return;
    }

    const token = `REC-${randomToken().slice(0, 18).toUpperCase()}`;
    const expiresAt = plusMinutes(RECOVERY_TTL_MINUTES);
    await run(
      "INSERT INTO account_recovery_tokens (accountId, token, expiresAt) VALUES (?, ?, ?)",
      [account.id, token, expiresAt]
    );

    const emailResult = await sendRecoveryEmail({
      to: account.identifier,
      displayName: account.displayName,
      token,
      expiresAt,
    });

    if (process.env.ENABLE_DEV_RECOVERY_TOKENS === "true" && process.env.NODE_ENV !== "production") {
      res.json({ ok: true, recoveryToken: token, expiresInMinutes: RECOVERY_TTL_MINUTES });
      return;
    }

    res.json({
      ok: true,
      emailSent: emailResult.sent,
      message: emailResult.sent
        ? "If this account exists, recovery instructions were sent."
        : "Recovery instructions were created, but email delivery is not configured.",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/auth/recovery/reset", recoveryRateLimit, async (req, res) => {
  try {
    const token = String(req.body.token || "").trim();
    const newPassword = String(req.body.newPassword || "");

    if (!token) {
      res.status(400).json({ error: "token is required" });
      return;
    }

    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      res.status(400).json({ error: passwordValidation.reason });
      return;
    }

    const recovery = await get(
      `SELECT * FROM account_recovery_tokens
       WHERE token = ? AND status = 'pending'`,
      [token]
    );
    if (!recovery) {
      res.status(400).json({ error: "Invalid recovery token" });
      return;
    }
    if (new Date(recovery.expiresAt).getTime() < Date.now()) {
      await run("UPDATE account_recovery_tokens SET status = 'expired' WHERE id = ?", [recovery.id]);
      res.status(400).json({ error: "Recovery token expired" });
      return;
    }

    await run("UPDATE accounts SET passwordHash = ? WHERE id = ?", [hashPassword(newPassword), recovery.accountId]);
    await run("UPDATE account_recovery_tokens SET status = 'used' WHERE id = ?", [recovery.id]);
    await run("DELETE FROM auth_sessions WHERE accountId = ?", [recovery.accountId]);

    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.get("/api/health", async (_req, res) => {
  try {
    await get("SELECT 1");
    res.json({ ok: true, database: "connected" });
  } catch {
    res.json({ ok: true, database: "disconnected" });
  }
});

app.get("/api/notifications/stream", async (req, res) => {
  try {
    const token = String(req.query.token || "").trim();
    const session = await getSessionFromToken(token);
    if (!session) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const householdId = session.membership.householdId;
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();
    res.write("event: ready\ndata: connected\n\n");
    addNotificationStream(householdId, res);

    const keepAlive = setInterval(() => {
      res.write("event: ping\ndata: keepalive\n\n");
    }, 25000);

    req.on("close", () => {
      clearInterval(keepAlive);
      removeNotificationStream(householdId, res);
      res.end();
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/dashboard", requireAuth, async (req, res) => {
  try {
    const householdId = req.auth.membership.householdId;
    const recentRows = await all(
      `SELECT m.*, v.name as vaultName
       FROM memories m
       LEFT JOIN vaults v ON v.id = m.vaultId
       WHERE m.householdId = ?
       ORDER BY datetime(m.createdAt) DESC
       LIMIT 4`,
      [householdId]
    );

    const notifications = await all(
      "SELECT id, text, timeLabel as time FROM notifications WHERE householdId = ? ORDER BY id DESC LIMIT 6",
      [householdId]
    );

    const membersCount = await get("SELECT COUNT(*) as count FROM members WHERE householdId = ?", [householdId]);
    const memoriesCount = await get("SELECT COUNT(*) as count FROM memories WHERE householdId = ?", [householdId]);
    const storageRows = await all(
      "SELECT name, usagePercent as percent FROM vaults WHERE householdId = ? ORDER BY usagePercent DESC LIMIT 4",
      [householdId]
    );

    const recentMemories = await attachFiles(recentRows.map(formatMemory));

    res.json({
      hero: {
        memories: memoriesCount.count,
        stored: "47 GB",
        members: membersCount.count,
        collections: storageRows.length,
      },
      recentMemories,
      storage: storageRows,
      notifications,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/memories", requireAuth, async (req, res) => {
  try {
    const householdId = req.auth.membership.householdId;
    const q = (req.query.q || "").toString().trim().toLowerCase();
    const vault = (req.query.vault || "").toString().trim();

    const rows = await all(
      `SELECT m.*, v.name as vaultName
       FROM memories m
       LEFT JOIN vaults v ON v.id = m.vaultId
       WHERE m.householdId = ?
       ORDER BY datetime(m.createdAt) DESC`
      ,[householdId]
    );

    let memories = await attachFiles(rows.map(formatMemory));

    if (vault && vault !== "All") {
      memories = memories.filter((item) => item.vaultName === vault);
    }

    if (q) {
      memories = memories.filter((item) => {
        const body = `${item.title} ${item.text} ${item.author} ${item.tags.join(" ")} ${item.vaultName}`.toLowerCase();
        return body.includes(q);
      });
    }

    res.json(memories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/timeline", requireAuth, async (req, res) => {
  try {
    const householdId = req.auth.membership.householdId;
    const year = String(req.query.year || "").trim();
    const monthInput = String(req.query.month || "").trim();
    const month = monthInput ? monthInput.padStart(2, "0") : "";

    const rows = await all(
      `SELECT m.*, v.name as vaultName
       FROM memories m
       LEFT JOIN vaults v ON v.id = m.vaultId
       WHERE m.householdId = ?
         AND (? = '' OR strftime('%Y', m.createdAt) = ?)
         AND (? = '' OR strftime('%m', m.createdAt) = ?)
       ORDER BY datetime(m.createdAt) DESC`,
      [householdId, year, year, month, month]
    );

    const yearsRows = await all(
      `SELECT DISTINCT strftime('%Y', createdAt) as year
       FROM memories
       WHERE householdId = ? AND createdAt IS NOT NULL
       ORDER BY year DESC`
      ,[householdId]
    );
    const monthsRows = await all(
      `SELECT DISTINCT strftime('%m', createdAt) as month
       FROM memories
       WHERE householdId = ? AND createdAt IS NOT NULL
       ORDER BY month ASC`
      ,[householdId]
    );

    const onThisDayRows = await all(
      `SELECT m.*, v.name as vaultName
       FROM memories m
       LEFT JOIN vaults v ON v.id = m.vaultId
       WHERE m.householdId = ?
         AND strftime('%m-%d', m.createdAt) = strftime('%m-%d', 'now')
       ORDER BY datetime(m.createdAt) DESC
       LIMIT 8`
      ,[householdId]
    );

    const entries = await attachFiles(rows.map(formatMemory));
    const onThisDay = await attachFiles(onThisDayRows.map(formatMemory));

    res.json({
      year,
      month,
      years: yearsRows.map((row) => row.year).filter(Boolean),
      months: monthsRows.map((row) => row.month).filter(Boolean),
      todayKey: new Date().toISOString().slice(5, 10),
      entries,
      onThisDay,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/insights", requireAuth, async (req, res) => {
  try {
    const householdId = req.auth.membership.householdId;
    const rows = await all(
      `SELECT m.author, m.tags, m.vaultId, m.createdAt, v.name as vaultName
       FROM memories m
       LEFT JOIN vaults v ON v.id = m.vaultId
       WHERE m.householdId = ?`,
      [householdId]
    );

    const totalMemories = rows.length;
    const authorCounts = {};
    const vaultCounts = {};
    const tagCounts = {};
    const monthCounts = {};
    const dayCounts = {};

    rows.forEach((row) => {
      const author = row.author || "Unknown";
      authorCounts[author] = (authorCounts[author] || 0) + 1;

      const vault = row.vaultName || "General";
      vaultCounts[vault] = (vaultCounts[vault] || 0) + 1;

      let tags = [];
      try {
        const parsed = JSON.parse(row.tags || "[]");
        if (Array.isArray(parsed)) {
          tags = parsed.map((tag) => String(tag).trim()).filter(Boolean);
        }
      } catch (_error) {
        tags = [];
      }
      tags.forEach((tag) => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });

      const dt = new Date(row.createdAt);
      if (!Number.isNaN(dt.getTime())) {
        const monthKey = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
        monthCounts[monthKey] = (monthCounts[monthKey] || 0) + 1;

        const dayName = dt.toLocaleDateString("en-US", { weekday: "short" });
        dayCounts[dayName] = (dayCounts[dayName] || 0) + 1;
      }
    });

    const topContributors = Object.entries(authorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    const vaultDistribution = Object.entries(vaultCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({
        name,
        count,
        percent: totalMemories ? Math.round((count / totalMemories) * 100) : 0,
      }));

    const tagTrends = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([tag, count]) => ({ tag, count }));

    const monthlyActivity = Object.entries(monthCounts)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-8)
      .map(([month, count]) => ({ month, count }));

    const dayOrder = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dayOfWeekActivity = dayOrder.map((day) => ({
      day,
      count: dayCounts[day] || 0,
    }));

    res.json({
      totals: {
        memories: totalMemories,
        contributors: Object.keys(authorCounts).length,
        vaultsUsed: Object.keys(vaultCounts).length,
        tagsUsed: Object.keys(tagCounts).length,
      },
      topContributors,
      vaultDistribution,
      tagTrends,
      monthlyActivity,
      dayOfWeekActivity,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/memories", requireAuth, requireRole("owner", "parent", "member"), async (req, res) => {
  try {
    const householdId = req.auth.membership.householdId;
    const { author, title, text, tags, vaultId, createdAt } = req.body;
    if (!title || !text) {
      res.status(400).json({ error: "title and text are required" });
      return;
    }

    const safeTags = Array.isArray(tags)
      ? tags.map((tag) => String(tag).trim()).filter(Boolean)
      : [];

    const parsedCreatedAt = createdAt ? new Date(createdAt) : null;
    const safeCreatedAt = parsedCreatedAt && !Number.isNaN(parsedCreatedAt.getTime())
      ? parsedCreatedAt.toISOString()
      : new Date().toISOString();

    const insert = await run(
      `INSERT INTO memories (householdId, author, emoji, color, title, text, tags, vaultId, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [householdId, author || req.auth.account.displayName, "M", "#fef3e6", title, text, JSON.stringify(safeTags), vaultId || null, safeCreatedAt]
    );

    await createNotification(householdId, `${author || req.auth.account.displayName} added a new memory: ${title}`, "Just now");

    const row = await getMemoryOr404(insert.lastID, householdId, res);
    if (!row) {
      return;
    }

    const withFiles = await attachFiles([formatMemory(row)]);
    res.status(201).json(withFiles[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch("/api/memories/:id", requireAuth, requireRole("parent"), async (req, res) => {
  try {
    const householdId = req.auth.membership.householdId;
    const id = Number(req.params.id);
    const row = await getMemoryOr404(id, householdId, res);
    if (!row) {
      return;
    }

    const { author, title, text, tags, vaultId } = req.body;
    const nextTitle = typeof title === "string" && title.trim() ? title.trim() : row.title;
    const nextText = typeof text === "string" && text.trim() ? text.trim() : row.text;
    const nextTags = Array.isArray(tags)
      ? JSON.stringify(tags.map((tag) => String(tag).trim()).filter(Boolean))
      : row.tags;
    const nextVaultId = vaultId === null || vaultId === "" ? null : Number(vaultId || row.vaultId);

    await run(
      `INSERT INTO memory_revisions (memoryId, editedBy, eventType, title, text, tags, vaultId)
       VALUES (?, ?, 'update', ?, ?, ?, ?)`,
      [id, author || "Unknown collaborator", row.title, row.text, row.tags, row.vaultId]
    );

    await run(
      `UPDATE memories
       SET title = ?, text = ?, tags = ?, vaultId = ?
       WHERE id = ?`,
      [nextTitle, nextText, nextTags, nextVaultId, id]
    );

    await createNotification(householdId, `Memory updated: ${nextTitle}`, "Just now");

    const updatedRow = await getMemoryOr404(id, householdId, res);
    if (!updatedRow) {
      return;
    }

    const withFiles = await attachFiles([formatMemory(updatedRow)]);
    res.json(withFiles[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/memories/:id/history", requireAuth, async (req, res) => {
  try {
    const householdId = req.auth.membership.householdId;
    const id = Number(req.params.id);
    const row = await getMemoryOr404(id, householdId, res);
    if (!row) {
      return;
    }

    const historyRows = await all(
      `SELECT mr.*, v.name as vaultName
       FROM memory_revisions mr
       LEFT JOIN vaults v ON v.id = mr.vaultId
       WHERE mr.memoryId = ?
       ORDER BY datetime(mr.createdAt) DESC, mr.id DESC
       LIMIT 30`,
      [id]
    );

    res.json(historyRows.map(formatMemoryRevision));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/memories/:id/restore", requireAuth, requireRole("parent"), async (req, res) => {
  try {
    const householdId = req.auth.membership.householdId;
    const id = Number(req.params.id);
    const revisionId = Number(req.body.revisionId);
    if (!revisionId) {
      res.status(400).json({ error: "revisionId is required" });
      return;
    }

    const current = await getMemoryOr404(id, householdId, res);
    if (!current) {
      return;
    }

    const revision = await get(
      "SELECT * FROM memory_revisions WHERE id = ? AND memoryId = ?",
      [revisionId, id]
    );
    if (!revision) {
      res.status(404).json({ error: "Revision not found" });
      return;
    }

    await run(
      `INSERT INTO memory_revisions (memoryId, editedBy, eventType, title, text, tags, vaultId)
       VALUES (?, ?, 'restore', ?, ?, ?, ?)`,
      [id, "System restore", current.title, current.text, current.tags, current.vaultId]
    );

    await run(
      `UPDATE memories
       SET title = ?, text = ?, tags = ?, vaultId = ?
       WHERE id = ?`,
      [revision.title, revision.text, revision.tags, revision.vaultId, id]
    );

    await createNotification(householdId, `Memory restored: ${revision.title}`, "Just now");

    const updatedRow = await getMemoryOr404(id, householdId, res);
    if (!updatedRow) {
      return;
    }
    const withFiles = await attachFiles([formatMemory(updatedRow)]);
    res.json(withFiles[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/memories/:id", requireAuth, requireRole("parent"), async (req, res) => {
  try {
    const householdId = req.auth.membership.householdId;
    const id = Number(req.params.id);
    const row = await getMemoryOr404(id, householdId, res);
    if (!row) {
      return;
    }

    const files = await all("SELECT id, storedName FROM memory_files WHERE memoryId = ?", [id]);
    for (const file of files) {
      const filePath = path.join(uploadsDir, file.storedName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await run("DELETE FROM memory_files WHERE memoryId = ?", [id]);
    await run("DELETE FROM memories WHERE id = ?", [id]);
    await createNotification(householdId, `Memory deleted: ${row.title}`, "Just now");

    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/memories/:id/files", requireAuth, requireRole("parent", "member"), upload.array("files", 10), async (req, res) => {
  try {
    const householdId = req.auth.membership.householdId;
    const id = Number(req.params.id);
    const row = await getMemoryOr404(id, householdId, res);
    if (!row) {
      return;
    }

    const uploaded = req.files || [];
    if (!uploaded.length) {
      res.status(400).json({ error: "No files uploaded" });
      return;
    }

    for (const file of uploaded) {
      await run(
        `INSERT INTO memory_files (memoryId, originalName, storedName, mimeType, size)
         VALUES (?, ?, ?, ?, ?)`,
        [id, file.originalname, file.filename, file.mimetype || "application/octet-stream", file.size || 0]
      );
    }

    await createNotification(householdId, `${uploaded.length} file(s) attached to: ${row.title}`, "Just now");

    const updatedRow = await getMemoryOr404(id, householdId, res);
    if (!updatedRow) {
      return;
    }

    const withFiles = await attachFiles([formatMemory(updatedRow)]);
    res.status(201).json(withFiles[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/memories/:memoryId/files/:fileId", requireAuth, requireRole("parent"), async (req, res) => {
  try {
    const householdId = req.auth.membership.householdId;
    const memoryId = Number(req.params.memoryId);
    const fileId = Number(req.params.fileId);

    const memory = await getMemoryOr404(memoryId, householdId, res);
    if (!memory) {
      return;
    }

    const file = await get("SELECT * FROM memory_files WHERE id = ? AND memoryId = ?", [fileId, memoryId]);
    if (!file) {
      res.status(404).json({ error: "File not found" });
      return;
    }

    const filePath = path.join(uploadsDir, file.storedName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await run("DELETE FROM memory_files WHERE id = ?", [fileId]);

    const updatedRow = await getMemoryOr404(memoryId, householdId, res);
    if (!updatedRow) {
      return;
    }

    const withFiles = await attachFiles([formatMemory(updatedRow)]);
    res.json(withFiles[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/memories/:memoryId/files/:fileId/download", requireAuth, async (req, res) => {
  try {
    const householdId = req.auth.membership.householdId;
    const memoryId = Number(req.params.memoryId);
    const fileId = Number(req.params.fileId);

    const memory = await getMemoryOr404(memoryId, householdId, res);
    if (!memory) {
      return;
    }

    const file = await get("SELECT * FROM memory_files WHERE id = ? AND memoryId = ?", [fileId, memoryId]);
    if (!file) {
      res.status(404).json({ error: "File not found" });
      return;
    }

    const filePath = path.resolve(uploadsDir, file.storedName);
    const resolvedUploadsDir = path.resolve(uploadsDir);
    if (!filePath.startsWith(`${resolvedUploadsDir}${path.sep}`) || !fs.existsSync(filePath)) {
      res.status(404).json({ error: "File not found" });
      return;
    }

    res.setHeader("Content-Type", file.mimeType || "application/octet-stream");
    res.setHeader("Content-Disposition", `inline; filename="${path.basename(file.originalName).replace(/"/g, "")}"`);
    res.sendFile(filePath);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/vaults", requireAuth, async (req, res) => {
  try {
    const rows = await all("SELECT * FROM vaults WHERE householdId = ? ORDER BY id", [req.auth.membership.householdId]);
    res.json(
      rows.map((row) => ({
        ...row,
        locked: Boolean(row.locked),
      }))
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/vaults", requireAuth, requireRole("parent"), async (req, res) => {
  try {
    const householdId = req.auth.membership.householdId;
    const { name, emoji, description, cover, accessLevel, locked } = req.body;
    if (!name || !emoji) {
      res.status(400).json({ error: "Name and emoji are required" });
      return;
    }

    await run(
      `INSERT INTO vaults (householdId, name, emoji, description, items, sizeLabel, cover, accessLevel, locked, usagePercent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [householdId, name, emoji, description, 0, "0 B", cover || "linear-gradient(135deg,#e5d3d3,#c4968e)", accessLevel || "family", locked ? 1 : 0, 0]
    );

    const vault = await get("SELECT * FROM vaults WHERE householdId = ? ORDER BY id DESC LIMIT 1", [householdId]);
    res.json({ ...vault, locked: Boolean(vault.locked) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch("/api/vaults/:id", requireAuth, requireRole("parent"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, emoji, description, cover, accessLevel, locked } = req.body;

    const updates = [];
    const values = [];
    if (name !== undefined) {
      updates.push("name = ?");
      values.push(name);
    }
    if (emoji !== undefined) {
      updates.push("emoji = ?");
      values.push(emoji);
    }
    if (description !== undefined) {
      updates.push("description = ?");
      values.push(description);
    }
    if (cover !== undefined) {
      updates.push("cover = ?");
      values.push(cover);
    }
    if (accessLevel !== undefined) {
      updates.push("accessLevel = ?");
      values.push(accessLevel);
    }
    if (locked !== undefined) {
      updates.push("locked = ?");
      values.push(locked ? 1 : 0);
    }

    if (!updates.length) {
      res.status(400).json({ error: "No fields to update" });
      return;
    }

    values.push(id, req.auth.membership.householdId);
    await run(`UPDATE vaults SET ${updates.join(", ")} WHERE id = ? AND householdId = ?`, values);

    const vault = await get("SELECT * FROM vaults WHERE id = ? AND householdId = ?", [id, req.auth.membership.householdId]);
    if (!vault) {
      res.status(404).json({ error: "Vault not found" });
      return;
    }
    res.json({ ...vault, locked: Boolean(vault.locked) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/vaults/:id", requireAuth, requireRole("parent"), async (req, res) => {
  try {
    const householdId = req.auth.membership.householdId;
    const id = Number(req.params.id);

    // Update memories to remove vault reference
    await run("UPDATE memories SET vaultId = NULL WHERE vaultId = ? AND householdId = ?", [id, householdId]);

    // Delete vault
    await run("DELETE FROM vaults WHERE id = ? AND householdId = ?", [id, householdId]);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/vaults/:id/memories", requireAuth, async (req, res) => {
  try {
    const householdId = req.auth.membership.householdId;
    const vaultId = Number(req.params.id);
    const query = req.query.q ? `%${req.query.q}%` : null;

    let sql = "SELECT * FROM memories WHERE vaultId = ? AND householdId = ? ORDER BY createdAt DESC";
    let params = [vaultId, householdId];

    if (query) {
      sql = "SELECT * FROM memories WHERE vaultId = ? AND householdId = ? AND (title LIKE ? OR text LIKE ? OR author LIKE ? OR tags LIKE ?) ORDER BY createdAt DESC";
      params = [vaultId, householdId, query, query, query, query];
    }

    const memories = await all(sql, params);
    const withFiles = await attachFiles(memories.map(formatMemory));
    res.json(withFiles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/members", requireAuth, async (req, res) => {
  try {
    const householdId = req.auth.membership.householdId;
    const rows = await all(
      `SELECT
         a.id,
         a.displayName as name,
         hm.role,
         hm.status,
         hm.createdAt as joinedRaw,
         m.initials,
         m.color,
         m.online,
         m.memories,
         m.vaults,
         m.joined
       FROM household_memberships hm
       JOIN accounts a ON a.id = hm.accountId
       LEFT JOIN members m
         ON m.householdId = hm.householdId
        AND LOWER(m.name) = LOWER(a.displayName)
       WHERE hm.householdId = ? AND hm.status = 'active'
       ORDER BY hm.id`,
      [householdId]
    );

    const palette = ["#6A8CAF", "#C77D5B", "#6F9D65", "#8C6FAF", "#4A6B8A"];
    const mapped = rows.map((row) => {
      const initials = row.initials || String(row.name || "")
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() || "")
        .join("") || "M";
      const fallbackColor = palette[(Number(row.id) || 0) % palette.length];
      const joinedDate = row.joined || String(row.joinedRaw || "").slice(0, 10) || new Date().toISOString().slice(0, 10);
      return {
        id: row.id,
        name: row.name,
        initials,
        role: row.role,
        color: row.color || fallbackColor,
        online: Boolean(row.online),
        memories: Number(row.memories || 0),
        vaults: Number(row.vaults || 0),
        joined: joinedDate,
      };
    });

    res.json(mapped);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/tree", requireAuth, async (req, res) => {
  try {
    const householdId = req.auth.membership.householdId;
    const nodes = await all("SELECT nodeId as id, x, y, label, subLabel as sub, color FROM tree_nodes WHERE householdId = ? ORDER BY id", [householdId]);
    const edgesRows = await all("SELECT sourceNode, targetNode FROM tree_edges WHERE householdId = ? ORDER BY id", [householdId]);
    res.json({ nodes, edges: edgesRows.map((r) => [r.sourceNode, r.targetNode]) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/tree/nodes", requireAuth, requireRole("parent"), async (req, res) => {
  try {
    const householdId = req.auth.membership.householdId;
    const label = String(req.body.label || "").trim();
    const subLabel = String(req.body.sub || req.body.subLabel || "").trim();
    const x = Number(req.body.x);
    const y = Number(req.body.y);
    const color = String(req.body.color || "#6A8CAF").trim();

    if (!label) {
      res.status(400).json({ error: "Name is required" });
      return;
    }
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      res.status(400).json({ error: "Valid x and y positions are required" });
      return;
    }

    const nodeId = `node-${householdId}-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
    await run(
      `INSERT INTO tree_nodes (householdId, nodeId, x, y, label, subLabel, color)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [householdId, nodeId, Math.round(x), Math.round(y), label, subLabel || "Family member", color]
    );

    await createNotification(householdId, `Family tree person added: ${label}`, "Just now");
    res.status(201).json({ id: nodeId, x: Math.round(x), y: Math.round(y), label, sub: subLabel || "Family member", color });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch("/api/tree/nodes/:nodeId", requireAuth, requireRole("parent"), async (req, res) => {
  try {
    const householdId = req.auth.membership.householdId;
    const nodeId = String(req.params.nodeId || "").trim();
    const existing = await get("SELECT * FROM tree_nodes WHERE householdId = ? AND nodeId = ?", [householdId, nodeId]);
    if (!existing) {
      res.status(404).json({ error: "Tree person not found" });
      return;
    }

    const label = typeof req.body.label === "string" && req.body.label.trim() ? req.body.label.trim() : existing.label;
    const subLabel = typeof req.body.sub === "string" ? req.body.sub.trim() : (typeof req.body.subLabel === "string" ? req.body.subLabel.trim() : existing.subLabel);
    const nextX = req.body.x !== undefined ? Number(req.body.x) : existing.x;
    const nextY = req.body.y !== undefined ? Number(req.body.y) : existing.y;
    const color = typeof req.body.color === "string" && req.body.color.trim() ? req.body.color.trim() : existing.color;

    if (!Number.isFinite(nextX) || !Number.isFinite(nextY)) {
      res.status(400).json({ error: "Valid x and y positions are required" });
      return;
    }

    await run(
      `UPDATE tree_nodes
       SET x = ?, y = ?, label = ?, subLabel = ?, color = ?
       WHERE householdId = ? AND nodeId = ?`,
      [Math.round(nextX), Math.round(nextY), label, subLabel, color, householdId, nodeId]
    );

    const updated = await get("SELECT nodeId as id, x, y, label, subLabel as sub, color FROM tree_nodes WHERE householdId = ? AND nodeId = ?", [householdId, nodeId]);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/tree/nodes/:nodeId", requireAuth, requireRole("parent"), async (req, res) => {
  try {
    const householdId = req.auth.membership.householdId;
    const nodeId = String(req.params.nodeId || "").trim();
    const existing = await get("SELECT label FROM tree_nodes WHERE householdId = ? AND nodeId = ?", [householdId, nodeId]);
    if (!existing) {
      res.status(404).json({ error: "Tree person not found" });
      return;
    }

    await run("DELETE FROM tree_edges WHERE householdId = ? AND (sourceNode = ? OR targetNode = ?)", [householdId, nodeId, nodeId]);
    await run("DELETE FROM tree_nodes WHERE householdId = ? AND nodeId = ?", [householdId, nodeId]);
    await createNotification(householdId, `Family tree person removed: ${existing.label}`, "Just now");
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/tree/edges", requireAuth, requireRole("parent"), async (req, res) => {
  try {
    const householdId = req.auth.membership.householdId;
    const sourceNode = String(req.body.sourceNode || "").trim();
    const targetNode = String(req.body.targetNode || "").trim();

    if (!sourceNode || !targetNode || sourceNode === targetNode) {
      res.status(400).json({ error: "Choose two different people to connect" });
      return;
    }

    const nodes = await all(
      "SELECT nodeId FROM tree_nodes WHERE householdId = ? AND nodeId IN (?, ?)",
      [householdId, sourceNode, targetNode]
    );
    if (nodes.length !== 2) {
      res.status(404).json({ error: "Both tree people must exist" });
      return;
    }

    const duplicate = await get(
      `SELECT id FROM tree_edges
       WHERE householdId = ?
       AND ((sourceNode = ? AND targetNode = ?) OR (sourceNode = ? AND targetNode = ?))`,
      [householdId, sourceNode, targetNode, targetNode, sourceNode]
    );
    if (duplicate) {
      res.status(409).json({ error: "Relationship already exists" });
      return;
    }

    await run("INSERT INTO tree_edges (householdId, sourceNode, targetNode) VALUES (?, ?, ?)", [householdId, sourceNode, targetNode]);
    res.status(201).json({ edge: [sourceNode, targetNode] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/tree/edges/:sourceNode/:targetNode", requireAuth, requireRole("parent"), async (req, res) => {
  try {
    const householdId = req.auth.membership.householdId;
    const sourceNode = String(req.params.sourceNode || "").trim();
    const targetNode = String(req.params.targetNode || "").trim();

    await run(
      `DELETE FROM tree_edges
       WHERE householdId = ?
       AND ((sourceNode = ? AND targetNode = ?) OR (sourceNode = ? AND targetNode = ?))`,
      [householdId, sourceNode, targetNode, targetNode, sourceNode]
    );
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/settings", requireAuth, async (req, res) => {
  try {
    const rows = await all("SELECT * FROM settings WHERE householdId = ? ORDER BY section, id", [req.auth.membership.householdId]);
    const grouped = rows.reduce((acc, row) => {
      if (!acc[row.section]) {
        acc[row.section] = { title: row.section, icon: row.icon, items: [] };
      }
      acc[row.section].items.push({
        id: row.id,
        label: row.itemLabel,
        desc: row.itemDescription,
        enabled: Boolean(row.enabled),
      });
      return acc;
    }, {});

    res.json(Object.values(grouped));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch("/api/settings/:id", requireAuth, requireRole("parent"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const enabled = req.body.enabled ? 1 : 0;

    await run("UPDATE settings SET enabled = ? WHERE id = ? AND householdId = ?", [enabled, id, req.auth.membership.householdId]);

    const updated = await get("SELECT * FROM settings WHERE id = ? AND householdId = ?", [id, req.auth.membership.householdId]);
    if (!updated) {
      res.status(404).json({ error: "Setting not found" });
      return;
    }
    res.json({
      id: updated.id,
      label: updated.itemLabel,
      desc: updated.itemDescription,
      enabled: Boolean(updated.enabled),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

if (require.main === module) {
  const startupAndListen = async () => {
    try {
      await startupPromise;
      const server = app.listen(port, host, () => {
        console.log(`Homecache API running on http://${host}:${port}`);
      });
      server.on("error", (error) => {
        console.error("Server failed to start:", error);
        process.exit(1);
      });
    } catch (error) {
      console.error("Failed to initialize database:", error);
      process.exit(1);
    }
  };
  startupAndListen();
}

module.exports = { app, startupPromise };
