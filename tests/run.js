const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "homecache-tests-"));
const dbPath = path.join(tempRoot, "homecache.db");
const uploadsDir = path.join(tempRoot, "uploads");
fs.mkdirSync(uploadsDir, { recursive: true });

process.env.DB_PATH = dbPath;
process.env.UPLOADS_DIR = uploadsDir;
process.env.APP_BASE_URL = "http://127.0.0.1:3000";
process.env.NODE_ENV = "test";
delete process.env.ENABLE_DEV_RECOVERY_TOKENS;

const { app, startupPromise } = require("../server/index");
const { get } = require("../server/db");

async function startServer() {
  await startupPromise;
  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      const { port } = server.address();
      resolve({ server, baseUrl: `http://127.0.0.1:${port}` });
    });
  });
}

async function request(baseUrl, method, route, options = {}) {
  const headers = new Headers(options.headers || {});
  const body = options.body;
  if (body && !(body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${baseUrl}${route}`, {
    method,
    headers,
    body,
  });

  const contentType = response.headers.get("content-type") || "";
  const text = await response.text();
  const payload = contentType.includes("application/json") ? JSON.parse(text || "{}") : text;
  return { response, payload, text };
}

async function createHouseholdUser(baseUrl, suffix) {
  const identifier = `owner-${suffix}@example.com`;
  const password = "familyPass123!";
  const register = await request(baseUrl, "POST", "/api/auth/register", {
    body: JSON.stringify({
      displayName: `Owner ${suffix}`,
      identifier,
      password,
      householdName: `Household ${suffix}`,
    }),
  });
  assert.strictEqual(register.response.status, 201, register.text);
  assert.ok(register.payload.token, "registration should return a session token");
  return { identifier, password, token: register.payload.token };
}

async function createMemberUser(baseUrl, ownerToken, suffix) {
  const identifier = `member-${suffix}@example.com`;
  const password = "memberPass123!";
  const created = await request(baseUrl, "POST", "/api/household/members", {
    headers: { Authorization: `Bearer ${ownerToken}` },
    body: JSON.stringify({
      displayName: `Member ${suffix}`,
      identifier,
      password,
      role: "member",
    }),
  });
  assert.strictEqual(created.response.status, 201, created.text);

  const login = await request(baseUrl, "POST", "/api/auth/login", {
    body: JSON.stringify({ identifier, password }),
  });
  assert.strictEqual(login.response.status, 200, login.text);
  assert.ok(login.payload.token, "member login should return a session token");
  return { identifier, password, token: login.payload.token };
}

async function testRecoveryFlow(baseUrl) {
  const suffix = crypto.randomBytes(3).toString("hex");
  const user = await createHouseholdUser(baseUrl, suffix);

  const recoveryRequest = await request(baseUrl, "POST", "/api/auth/recovery/request", {
    body: JSON.stringify({ identifier: user.identifier }),
  });
  assert.strictEqual(recoveryRequest.response.status, 200, recoveryRequest.text);
  assert.ok(!("recoveryToken" in recoveryRequest.payload), "token should not be returned to the client");
  assert.match(recoveryRequest.payload.message || "", /sent|configured/i);

  const tokenRow = await get(
    "SELECT token FROM account_recovery_tokens WHERE accountId = (SELECT id FROM accounts WHERE identifier = ?) ORDER BY id DESC LIMIT 1",
    [user.identifier]
  );
  assert.ok(tokenRow?.token, "recovery token should be stored in the database");

  const newPassword = "newFamilyPass123!";
  const resetResponse = await request(baseUrl, "POST", "/api/auth/recovery/reset", {
    body: JSON.stringify({ token: tokenRow.token, newPassword }),
  });
  assert.strictEqual(resetResponse.response.status, 200, resetResponse.text);
  assert.strictEqual(resetResponse.payload.ok, true);

  const oldLogin = await request(baseUrl, "POST", "/api/auth/login", {
    body: JSON.stringify({ identifier: user.identifier, password: user.password }),
  });
  assert.strictEqual(oldLogin.response.status, 401, oldLogin.text);

  const newLogin = await request(baseUrl, "POST", "/api/auth/login", {
    body: JSON.stringify({ identifier: user.identifier, password: newPassword }),
  });
  assert.strictEqual(newLogin.response.status, 200, newLogin.text);
  assert.ok(newLogin.payload.token, "login after recovery should succeed");
}

async function testProtectedFileDownload(baseUrl) {
  const suffix = crypto.randomBytes(3).toString("hex");
  const user = await createHouseholdUser(baseUrl, suffix);

  const authHeaders = { Authorization: `Bearer ${user.token}` };
  const vaults = await request(baseUrl, "GET", "/api/vaults", { headers: authHeaders });
  assert.strictEqual(vaults.response.status, 200, vaults.text);
  const createdVault = await request(baseUrl, "POST", "/api/vaults", {
    headers: authHeaders,
    body: JSON.stringify({
      name: "Test Vault",
      emoji: "V",
      description: "Private files for tests",
      accessLevel: "family",
      locked: false,
    }),
  });
  assert.strictEqual(createdVault.response.status, 200, createdVault.text);
  const vaultId = createdVault.payload?.id;
  assert.ok(vaultId, "expected a created vault for attachments");

  const memoryResponse = await request(baseUrl, "POST", "/api/memories", {
    headers: authHeaders,
    body: JSON.stringify({
      title: "Test memory",
      text: "A private family test memory.",
      vaultId,
      tags: ["test"],
    }),
  });
  assert.strictEqual(memoryResponse.response.status, 201, memoryResponse.text);
  const memoryId = memoryResponse.payload.id;
  assert.ok(memoryId, "memory should be created");

  const formData = new FormData();
  formData.append(
    "files",
    new Blob(["hello family"], { type: "text/plain" }),
    "note.txt"
  );

  const uploadResponse = await request(baseUrl, "POST", `/api/memories/${memoryId}/files`, {
    headers: authHeaders,
    body: formData,
  });
  assert.strictEqual(uploadResponse.response.status, 201, uploadResponse.text);
  const file = uploadResponse.payload.files?.[0];
  assert.ok(file?.id, "uploaded file should be attached to the memory");

  const unauthorized = await request(baseUrl, "GET", `/api/memories/${memoryId}/files/${file.id}/download`);
  assert.strictEqual(unauthorized.response.status, 401, unauthorized.text);

  const authorized = await request(baseUrl, "GET", `/api/memories/${memoryId}/files/${file.id}/download`, {
    headers: authHeaders,
  });
  assert.strictEqual(authorized.response.status, 200, authorized.text);
  assert.strictEqual(authorized.text, "hello family");
}

async function testMemberContributorPermissions(baseUrl) {
  const suffix = crypto.randomBytes(3).toString("hex");
  const owner = await createHouseholdUser(baseUrl, suffix);
  const ownerHeaders = { Authorization: `Bearer ${owner.token}` };
  const member = await createMemberUser(baseUrl, owner.token, suffix);
  const memberHeaders = { Authorization: `Bearer ${member.token}` };

  const createdVault = await request(baseUrl, "POST", "/api/vaults", {
    headers: ownerHeaders,
    body: JSON.stringify({
      name: "Contributor Vault",
      emoji: "V",
      description: "A vault members can contribute memories to.",
      accessLevel: "family",
      locked: false,
    }),
  });
  assert.strictEqual(createdVault.response.status, 200, createdVault.text);

  const memberMemory = await request(baseUrl, "POST", "/api/memories", {
    headers: memberHeaders,
    body: JSON.stringify({
      title: "Member contribution",
      text: "A member can still add useful family context.",
      vaultId: createdVault.payload.id,
      tags: ["member"],
    }),
  });
  assert.strictEqual(memberMemory.response.status, 201, memberMemory.text);

  const formData = new FormData();
  formData.append("files", new Blob(["member upload"], { type: "text/plain" }), "member-note.txt");
  const memberUpload = await request(baseUrl, "POST", `/api/memories/${memberMemory.payload.id}/files`, {
    headers: memberHeaders,
    body: formData,
  });
  assert.strictEqual(memberUpload.response.status, 201, memberUpload.text);
  const memberFile = memberUpload.payload.files?.[0];
  assert.ok(memberFile?.id, "member upload should attach a file");

  const blockedRequests = [
    ["PATCH", `/api/memories/${memberMemory.payload.id}`, { title: "Changed by member" }],
    ["DELETE", `/api/memories/${memberMemory.payload.id}`],
    ["DELETE", `/api/memories/${memberMemory.payload.id}/files/${memberFile.id}`],
    ["POST", "/api/vaults", { name: "Blocked Vault", emoji: "V", description: "No", accessLevel: "family" }],
    ["PATCH", `/api/vaults/${createdVault.payload.id}`, { name: "Blocked Rename" }],
    ["DELETE", `/api/vaults/${createdVault.payload.id}`],
    ["POST", "/api/tree/nodes", { label: "Blocked Person", x: 100, y: 100 }],
    ["POST", "/api/tree/edges", { sourceNode: "a", targetNode: "b" }],
    ["PATCH", "/api/settings/1", { enabled: true }],
    ["GET", "/api/household/invites"],
  ];

  for (const [method, route, body] of blockedRequests) {
    const result = await request(baseUrl, method, route, {
      headers: memberHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });
    assert.strictEqual(result.response.status, 403, `${method} ${route} should be admin-only: ${result.text}`);
  }
}

async function main() {
  const { server, baseUrl } = await startServer();
  const tests = [
    ["recovery stays private", testRecoveryFlow],
    ["files require auth", testProtectedFileDownload],
    ["members can contribute but not administer", testMemberContributorPermissions],
  ];

  try {
    for (const [name, test] of tests) {
      await test(baseUrl);
      process.stdout.write(`✓ ${name}\n`);
    }
    process.stdout.write("All tests passed\n");
  } finally {
    await new Promise((resolve) => server.close(resolve));
    try {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    } catch (_error) {
      // Ignore cleanup failures in CI-style runs.
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
