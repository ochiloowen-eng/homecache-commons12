const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const express = require("express");
const { chromium } = require("@playwright/test");

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "homecache-browser-"));
const dbPath = path.join(tempRoot, "homecache.db");
const uploadsDir = path.join(tempRoot, "uploads");
const buildDir = path.join(process.cwd(), "build");
const clientHost = "localhost";
const apiHost = "localhost";
const clientPort = 3000;
const apiPort = 4000;
const clientUrl = `http://${clientHost}:${clientPort}`;
const apiUrl = `http://${apiHost}:${apiPort}`;

if (!fs.existsSync(path.join(buildDir, "index.html"))) {
  throw new Error("Missing build/ output. Run `npm run build` before the browser smoke test.");
}

fs.mkdirSync(uploadsDir, { recursive: true });

process.env.DB_PATH = dbPath;
process.env.UPLOADS_DIR = uploadsDir;
process.env.APP_BASE_URL = clientUrl;
process.env.NODE_ENV = "test";
delete process.env.ENABLE_DEV_RECOVERY_TOKENS;

const { app, startupPromise } = require("../server/index");

async function startApiServer() {
  await startupPromise;
  return new Promise((resolve, reject) => {
    const server = app.listen(apiPort, apiHost, () => resolve(server));
    server.on("error", reject);
  });
}

async function startClientServer() {
  const clientApp = express();
  clientApp.use(express.static(buildDir));
  clientApp.use((_req, res) => {
    res.sendFile(path.join(buildDir, "index.html"));
  });

  return new Promise((resolve, reject) => {
    const server = clientApp.listen(clientPort, clientHost, () => resolve(server));
    server.on("error", reject);
  });
}

async function main() {
  const apiServer = await startApiServer();
  const clientServer = await startClientServer();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();

  try {
    const identifier = `browser-${Date.now()}@example.com`;
    const password = "SmokePass123!";
    const registerResponse = await fetch(`${apiUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName: "Browser Smoke Owner",
        identifier,
        password,
        householdName: "Browser Smoke Family",
      }),
    });
    assert.strictEqual(registerResponse.status, 201);

    await page.goto(clientUrl, { waitUntil: "networkidle" });

    await page.getByLabel("Email or Phone").fill(identifier);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Continue" }).click();

    await page.getByRole("button", { name: "Logout" }).waitFor({ state: "visible", timeout: 30000 });
    await page.getByRole("button", { name: "Add Memory" }).click();

    const memoryTitle = `Smoke memory ${Date.now()}`;
    const uploadName = "family-note.txt";
    const uploadPath = path.join(tempRoot, uploadName);
    fs.writeFileSync(uploadPath, "browser smoke upload");

    await page.getByLabel("Memory Title").fill(memoryTitle);
    await page.getByLabel("Description").fill("A browser smoke test memory.");
    await page.getByLabel("Attach Files").setInputFiles(uploadPath);
    await page.getByRole("button", { name: "Save Memory" }).click();

    await page.locator(".hc-nav-item", { hasText: "Memories" }).click();
    await page.getByText(memoryTitle, { exact: false }).waitFor({ state: "visible", timeout: 30000 });

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: uploadName }).click();
    const download = await downloadPromise;
    const downloadedPath = await download.path();
    assert.ok(downloadedPath, "expected a downloaded file path");
    assert.strictEqual(fs.readFileSync(downloadedPath, "utf8"), "browser smoke upload");

    console.log("✓ browser smoke test passed");
  } finally {
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
    await new Promise((resolve) => clientServer.close(resolve));
    await new Promise((resolve) => apiServer.close(resolve));
    try {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    } catch (_error) {
      // Ignore cleanup failures.
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
