const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const sqlite3 = require("sqlite3").verbose();

const {
  seedVaults,
  seedMembers,
  seedMemories,
  seedNotifications,
  treeNodes,
  treeEdges,
  seedSettings,
} = require("./seedData");

const dataDir = path.join(__dirname, "data");
const dbPath = process.env.DB_PATH || path.join(dataDir, "homecache.db");
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath);
const dbType = "sqlite";

function legacyHashPassword(password) {
  return crypto.createHash("sha256").update(String(password)).digest("hex");
}

const run = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) {
        reject(err);
        return;
      }
      resolve(this);
    });
  });

const get = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(row);
    });
  });

const all = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows);
    });
  });

async function ensureColumn(table, column, definition) {
  const columns = await all(`PRAGMA table_info("${table}")`);
  const exists = columns.some((col) => col.name === column);
  if (!exists) {
    try {
      await run(`ALTER TABLE "${table}" ADD COLUMN "${column}" ${definition}`);
    } catch (error) {
      if (!String(error?.message || "").toLowerCase().includes("duplicate column name")) {
        throw error;
      }
    }
  }
}

async function createSchema() {
  await run(`
    CREATE TABLE IF NOT EXISTS households (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      displayName TEXT NOT NULL,
      identifier TEXT NOT NULL UNIQUE,
      passwordHash TEXT NOT NULL,
      createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS household_memberships (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      householdId INTEGER NOT NULL,
      accountId INTEGER NOT NULL,
      role TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(householdId, accountId),
      FOREIGN KEY(householdId) REFERENCES households(id),
      FOREIGN KEY(accountId) REFERENCES accounts(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS auth_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      accountId INTEGER NOT NULL,
      token TEXT NOT NULL UNIQUE,
      expiresAt TEXT NOT NULL,
      createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(accountId) REFERENCES accounts(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS household_invites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      householdId INTEGER NOT NULL,
      code TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL,
      createdByAccountId INTEGER NOT NULL,
      invitedContact TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      expiresAt TEXT NOT NULL,
      usedByAccountId INTEGER,
      createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(householdId) REFERENCES households(id),
      FOREIGN KEY(createdByAccountId) REFERENCES accounts(id),
      FOREIGN KEY(usedByAccountId) REFERENCES accounts(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS account_recovery_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      accountId INTEGER NOT NULL,
      token TEXT NOT NULL UNIQUE,
      expiresAt TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(accountId) REFERENCES accounts(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS vaults (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      householdId INTEGER,
      name TEXT NOT NULL,
      emoji TEXT NOT NULL,
      description TEXT NOT NULL,
      items INTEGER NOT NULL,
      sizeLabel TEXT NOT NULL,
      cover TEXT NOT NULL,
      accessLevel TEXT NOT NULL,
      locked INTEGER NOT NULL DEFAULT 0,
      usagePercent INTEGER NOT NULL DEFAULT 0
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      householdId INTEGER,
      name TEXT NOT NULL,
      initials TEXT NOT NULL,
      role TEXT NOT NULL,
      color TEXT NOT NULL,
      online INTEGER NOT NULL DEFAULT 0,
      memories INTEGER NOT NULL DEFAULT 0,
      vaults INTEGER NOT NULL DEFAULT 0,
      joined TEXT NOT NULL
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS memories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      householdId INTEGER,
      author TEXT NOT NULL,
      emoji TEXT NOT NULL,
      color TEXT NOT NULL,
      title TEXT NOT NULL,
      text TEXT NOT NULL,
      tags TEXT NOT NULL,
      vaultId INTEGER,
      createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(vaultId) REFERENCES vaults(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS memory_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      memoryId INTEGER NOT NULL,
      originalName TEXT NOT NULL,
      storedName TEXT NOT NULL,
      mimeType TEXT NOT NULL,
      size INTEGER NOT NULL,
      createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(memoryId) REFERENCES memories(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS memory_revisions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      householdId INTEGER,
      memoryId INTEGER NOT NULL,
      editedBy TEXT NOT NULL,
      eventType TEXT NOT NULL DEFAULT 'update',
      title TEXT NOT NULL,
      text TEXT NOT NULL,
      tags TEXT NOT NULL,
      vaultId INTEGER,
      createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(memoryId) REFERENCES memories(id),
      FOREIGN KEY(vaultId) REFERENCES vaults(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      householdId INTEGER,
      text TEXT NOT NULL,
      timeLabel TEXT NOT NULL,
      createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS tree_nodes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      householdId INTEGER,
      nodeId TEXT NOT NULL UNIQUE,
      x INTEGER NOT NULL,
      y INTEGER NOT NULL,
      label TEXT NOT NULL,
      subLabel TEXT NOT NULL,
      color TEXT NOT NULL
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS tree_edges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      householdId INTEGER,
      sourceNode TEXT NOT NULL,
      targetNode TEXT NOT NULL
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      householdId INTEGER,
      section TEXT NOT NULL,
      icon TEXT NOT NULL,
      itemLabel TEXT NOT NULL,
      itemDescription TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 0
    )
  `);

  await ensureColumn("vaults", "householdId", "INTEGER");
  await ensureColumn("members", "householdId", "INTEGER");
  await ensureColumn("memories", "householdId", "INTEGER");
  await ensureColumn("memory_revisions", "householdId", "INTEGER");
  await ensureColumn("notifications", "householdId", "INTEGER");
  await ensureColumn("tree_nodes", "householdId", "INTEGER");
  await ensureColumn("tree_edges", "householdId", "INTEGER");
  await ensureColumn("settings", "householdId", "INTEGER");
}

async function seedIfEmpty() {
  let defaultHousehold = await get("SELECT id FROM households ORDER BY id LIMIT 1");
  if (!defaultHousehold) {
    const household = await run("INSERT INTO households (name) VALUES (?)", ["Default Family"]);
    defaultHousehold = { id: household.lastID };
  }

  const row = await get("SELECT COUNT(*) as count FROM memories");
  if (!row || row.count === 0) {
    for (const vault of seedVaults) {
      await run(
        `INSERT INTO vaults (householdId, name, emoji, description, items, sizeLabel, cover, accessLevel, locked, usagePercent)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          defaultHousehold.id,
          vault.name,
          vault.emoji,
          vault.description,
          vault.items,
          vault.sizeLabel,
          vault.cover,
          vault.accessLevel,
          vault.locked,
          vault.usagePercent,
        ]
      );
    }

    for (const member of seedMembers) {
      await run(
        `INSERT INTO members (householdId, name, initials, role, color, online, memories, vaults, joined)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          defaultHousehold.id,
          member.name,
          member.initials,
          member.role,
          member.color,
          member.online,
          member.memories,
          member.vaults,
          member.joined,
        ]
      );
    }

    for (const notification of seedNotifications) {
      await run(
        "INSERT INTO notifications (householdId, text, timeLabel) VALUES (?, ?, ?)",
        [defaultHousehold.id, notification.text, notification.timeLabel]
      );
    }

    for (const node of treeNodes) {
      await run(
        `INSERT INTO tree_nodes (householdId, nodeId, x, y, label, subLabel, color)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [defaultHousehold.id, node.nodeId, node.x, node.y, node.label, node.subLabel, node.color]
      );
    }

    for (const [sourceNode, targetNode] of treeEdges) {
      await run(
        "INSERT INTO tree_edges (householdId, sourceNode, targetNode) VALUES (?, ?, ?)",
        [defaultHousehold.id, sourceNode, targetNode]
      );
    }

    for (const setting of seedSettings) {
      await run(
        `INSERT INTO settings (householdId, section, icon, itemLabel, itemDescription, enabled)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [defaultHousehold.id, setting.section, setting.icon, setting.itemLabel, setting.itemDescription, setting.enabled]
      );
    }

    for (const memory of seedMemories) {
      const vault = await get("SELECT id FROM vaults WHERE householdId = ? AND name = ? LIMIT 1", [defaultHousehold.id, memory.vaultName]);
      await run(
        `INSERT INTO memories (householdId, author, emoji, color, title, text, tags, vaultId)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          defaultHousehold.id,
          memory.author,
          memory.emoji,
          memory.color,
          memory.title,
          memory.text,
          JSON.stringify(memory.tags),
          vault?.id || null,
        ]
      );
    }
  }

  await run("UPDATE vaults SET householdId = ? WHERE householdId IS NULL", [defaultHousehold.id]);
  await run("UPDATE members SET householdId = ? WHERE householdId IS NULL", [defaultHousehold.id]);
  await run("UPDATE memories SET householdId = ? WHERE householdId IS NULL", [defaultHousehold.id]);
  await run("UPDATE memory_revisions SET householdId = ? WHERE householdId IS NULL", [defaultHousehold.id]);
  await run("UPDATE notifications SET householdId = ? WHERE householdId IS NULL", [defaultHousehold.id]);
  await run("UPDATE tree_nodes SET householdId = ? WHERE householdId IS NULL", [defaultHousehold.id]);
  await run("UPDATE tree_edges SET householdId = ? WHERE householdId IS NULL", [defaultHousehold.id]);
  await run("UPDATE settings SET householdId = ? WHERE householdId IS NULL", [defaultHousehold.id]);
  await run("UPDATE memories SET emoji = 'M' WHERE TRIM(emoji) = '??'");
  await run(
    `UPDATE vaults SET emoji = CASE name
      WHEN 'Family Photos' THEN 'P'
      WHEN 'Legal and Estate' THEN 'L'
      WHEN 'Heritage Recipes' THEN 'R'
      WHEN 'Medical History' THEN 'H'
      ELSE 'V' END
    WHERE TRIM(emoji) = '??'`
  );
  await run(
    `UPDATE settings SET icon = CASE section
      WHEN 'Encryption and Security' THEN 'S'
      WHEN 'Sync and Distribution' THEN 'N'
      WHEN 'Privacy and Access' THEN 'P'
      ELSE 'S' END
    WHERE TRIM(icon) = '??'`
  );
}

async function removeKnownDemoAccount() {
  const demo = await get("SELECT id, passwordHash FROM accounts WHERE identifier = ?", ["owner@homecache.dev"]);
  if (!demo || demo.passwordHash !== legacyHashPassword("demo1234")) {
    return;
  }
  await run("DELETE FROM auth_sessions WHERE accountId = ?", [demo.id]);
  await run("DELETE FROM account_recovery_tokens WHERE accountId = ?", [demo.id]);
  await run("DELETE FROM household_memberships WHERE accountId = ?", [demo.id]);
  await run("DELETE FROM accounts WHERE id = ?", [demo.id]);
}

async function initDb() {
  console.log("Using SQLite database");
  await createSchema();
  await seedIfEmpty();
  await removeKnownDemoAccount();
}

module.exports = {
  db,
  run,
  get,
  all,
  initDb,
  dbType,
};
