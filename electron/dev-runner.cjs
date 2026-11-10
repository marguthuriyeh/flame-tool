#!/usr/bin/env node
const { spawn } = require("child_process");
const http = require("http");
const os = require("os");
const path = require("path");

const root = path.join(__dirname, "..");
const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");
const electronBin = require("electron");
const settingsPath =
  process.env.FLAME_SETTINGS_PATH || path.join(os.homedir(), ".flame-tool", "settings.json");

function waitForUrl(url, timeoutMs = 90_000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      const req = http.get(url, (res) => {
        res.resume();
        if ((res.statusCode || 500) < 500) {
          resolve();
          return;
        }
        retry();
      });
      req.on("error", retry);
      req.setTimeout(1500, () => {
        req.destroy();
        retry();
      });
    };
    const retry = () => {
      if (Date.now() - start > timeoutMs) {
        reject(new Error(`Timed out waiting for ${url}`));
        return;
      }
      setTimeout(tick, 400);
    };
    tick();
  });
}

const next = spawn(process.execPath, [nextBin, "dev", "-H", "127.0.0.1", "-p", "3000"], {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, FLAME_SETTINGS_PATH: settingsPath },
});

let electronProc = null;
let shuttingDown = false;

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  if (electronProc && !electronProc.killed) electronProc.kill("SIGTERM");
  if (next && !next.killed) next.kill("SIGTERM");
  setTimeout(() => process.exit(code), 300);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

next.on("exit", (code) => {
  if (!shuttingDown) shutdown(code || 0);
});

waitForUrl("http://127.0.0.1:3000/api/status")
  .then(() => {
    electronProc = spawn(electronBin, ["."], {
      cwd: root,
      stdio: "inherit",
      env: {
        ...process.env,
        FLAME_SETTINGS_PATH: settingsPath,
        ELECTRON_START_URL: "http://127.0.0.1:3000",
      },
    });
    electronProc.on("exit", (code) => shutdown(code || 0));
  })
  .catch((error) => {
    console.error(error);
    shutdown(1);
  });
