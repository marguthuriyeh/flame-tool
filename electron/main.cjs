const {
  app,
  BrowserWindow,
  desktopCapturer,
  globalShortcut,
  ipcMain,
  nativeImage,
  screen,
  session,
  shell,
  systemPreferences,
} = require("electron");
const path = require("path");
const http = require("http");
const { spawn } = require("child_process");
const {
  applyStoredKeyToEnv,
  getGeminiApiKey,
  setGeminiApiKey,
  settingsPath,
} = require("./settings.cjs");

const isDev = !app.isPackaged;
const DEV_URL = process.env.ELECTRON_START_URL || "http://127.0.0.1:3000";
const ANALYZE_ACCELERATOR = "CommandOrControl+Shift+A";
const MAX_CAPTURE_EDGE = 1600;

/** @type {BrowserWindow | null} */
let mainWindow = null;
/** @type {import('child_process').ChildProcess | null} */
let nextProcess = null;
let nextPort = 0;
let hotkeyBusy = false;

function iconPath() {
  return path.join(__dirname, "resources", "icon.png");
}

function analyzeShortcutLabel() {
  return process.platform === "darwin" ? "⌘⇧A" : "Ctrl+Shift+A";
}

function getScreenAccessStatus() {
  if (process.platform !== "darwin") return "granted";
  try {
    return systemPreferences.getMediaAccessStatus("screen");
  } catch {
    return "unknown";
  }
}

function downscaleToJpeg(pngBuffer) {
  const image = nativeImage.createFromBuffer(pngBuffer);
  const size = image.getSize();
  if (!size.width || !size.height) {
    return null;
  }
  const scale = Math.min(1, MAX_CAPTURE_EDGE / Math.max(size.width, size.height));
  const width = Math.max(1, Math.round(size.width * scale));
  const height = Math.max(1, Math.round(size.height * scale));
  const resized =
    scale < 1 ? image.resize({ width, height, quality: "better" }) : image;
  const jpeg = resized.toJPEG(82);
  const out = resized.getSize();
  return {
    mime: "image/jpeg",
    width: out.width,
    height: out.height,
    base64: Buffer.from(jpeg).toString("base64"),
  };
}

async function setupDisplayMediaHandler() {
  session.defaultSession.setDisplayMediaRequestHandler(async (_request, callback) => {
    try {
      const status = getScreenAccessStatus();
      if (status === "denied" || status === "restricted") {
        callback({});
        return;
      }
      const sources = await desktopCapturer.getSources({
        types: ["screen"],
        thumbnailSize: { width: 0, height: 0 },
      });
      if (!sources.length) {
        callback({});
        return;
      }
      const primary = screen.getPrimaryDisplay();
      const matched =
        sources.find((source) => {
          const match = /display[- ]?(\d+)/i.exec(source.id);
          return match && Number(match[1]) === primary.id;
        }) || sources[0];
      callback({ video: matched });
    } catch (error) {
      console.error("display media handler failed", error);
      callback({});
    }
  });
}

async function capturePrimaryScreen() {
  const status = getScreenAccessStatus();
  if (status === "denied" || status === "restricted") {
    return {
      ok: false,
      code: "permission-denied",
      status,
      message:
        "Screen Recording is turned off for The Flame Tool. Enable it in System Settings > Privacy & Security > Screen Recording, then quit and reopen the app.",
    };
  }

  const primary = screen.getPrimaryDisplay();
  const width = Math.max(1, Math.round(primary.size.width * primary.scaleFactor));
  const height = Math.max(1, Math.round(primary.size.height * primary.scaleFactor));

  const sources = await desktopCapturer.getSources({
    types: ["screen"],
    thumbnailSize: { width, height },
  });

  if (!sources.length) {
    return {
      ok: false,
      code: "permission-denied",
      status,
      message:
        "macOS blocked screen capture. Enable The Flame Tool in System Settings > Privacy & Security > Screen Recording, then quit and reopen the app.",
    };
  }

  const matched =
    sources.find((source) => {
      const match = /display[- ]?(\d+)/i.exec(source.id);
      return match && Number(match[1]) === primary.id;
    }) || sources[0];

  const png = matched.thumbnail.toPNG();
  if (!png || png.length === 0) {
    return {
      ok: false,
      code: "empty-frame",
      status,
      message:
        "The screen frame came back empty. Check System Settings > Privacy & Security > Screen Recording for The Flame Tool.",
    };
  }

  const jpeg = downscaleToJpeg(png);
  if (!jpeg) {
    return {
      ok: false,
      code: "empty-frame",
      status,
      message: "Could not prepare the screen frame.",
    };
  }

  return {
    ok: true,
    status,
    mime: jpeg.mime,
    width: jpeg.width,
    height: jpeg.height,
    base64: jpeg.base64,
  };
}

function focusMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
  if (process.platform === "darwin" && app.dock) {
    app.dock.show();
  }
}

async function runHotkeyAnalyze() {
  if (hotkeyBusy) return;
  hotkeyBusy = true;
  try {
    // Capture before focusing so The Flame Tool window is not in the frame.
    const captured = await capturePrimaryScreen();
    focusMainWindow();
    if (!mainWindow || mainWindow.isDestroyed()) return;
    mainWindow.webContents.send("analyze:hotkey", captured);
  } catch (error) {
    console.error("hotkey analyze failed", error);
    focusMainWindow();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("analyze:hotkey", {
        ok: false,
        code: "hotkey-failed",
        status: getScreenAccessStatus(),
        message: "Hotkey Analyze failed. Try the Analyze button.",
      });
    }
  } finally {
    hotkeyBusy = false;
  }
}

function registerAnalyzeHotkey() {
  const ok = globalShortcut.register(ANALYZE_ACCELERATOR, () => {
    void runHotkeyAnalyze();
  });
  if (!ok) {
    console.error("Failed to register Analyze hotkey", ANALYZE_ACCELERATOR);
  }
}

function waitForUrl(url, timeoutMs = 90_000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      const req = http.get(url, (res) => {
        res.resume();
        if ((res.statusCode || 500) < 500) {
          resolve(url);
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

function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = http.createServer();
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close();
        reject(new Error("Could not allocate a local port."));
        return;
      }
      const { port } = address;
      server.close((error) => (error ? reject(error) : resolve(port)));
    });
    server.on("error", reject);
  });
}

async function startNextServer() {
  applyStoredKeyToEnv();
  nextPort = await findFreePort();
  process.env.PORT = String(nextPort);
  process.env.HOSTNAME = "127.0.0.1";

  const standaloneDir = app.isPackaged
    ? path.join(process.resourcesPath, "standalone")
    : path.join(__dirname, "..", ".next", "standalone");
  const serverEntry = path.join(standaloneDir, "server.js");

  applyStoredKeyToEnv();
  nextProcess = spawn(process.execPath, [serverEntry], {
    cwd: standaloneDir,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      PORT: String(nextPort),
      HOSTNAME: "127.0.0.1",
      FLAME_SETTINGS_PATH: process.env.FLAME_SETTINGS_PATH || settingsPath(),
    },
    stdio: "inherit",
  });

  nextProcess.on("exit", (code) => {
    console.log("Next server exited", code);
  });

  await waitForUrl(`http://127.0.0.1:${nextPort}/api/status`);
  return `http://127.0.0.1:${nextPort}`;
}

async function resolveStartUrl() {
  if (isDev) {
    applyStoredKeyToEnv();
    await waitForUrl(`${DEV_URL}/api/status`);
    return DEV_URL;
  }
  return startNextServer();
}

async function createWindow() {
  const startUrl = await resolveStartUrl();

  mainWindow = new BrowserWindow({
    width: 420,
    height: 560,
    minWidth: 360,
    minHeight: 440,
    title: "The Flame Tool",
    backgroundColor: "#0a0a0b",
    autoHideMenuBar: true,
    icon: iconPath(),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.on("page-title-updated", (event) => {
    event.preventDefault();
    mainWindow?.setTitle("The Flame Tool");
  });

  await mainWindow.loadURL(startUrl);

  if (isDev && process.env.FLAME_OPEN_DEVTOOLS === "1") {
    mainWindow.webContents.openDevTools({ mode: "detach" });
  }
}

function registerIpc() {
  ipcMain.handle("app:platform", () => process.platform);
  ipcMain.handle("app:analyzeShortcut", () => analyzeShortcutLabel());

  ipcMain.handle("screen:access", () => {
    const status = getScreenAccessStatus();
    return { status, platform: process.platform };
  });

  ipcMain.handle("screen:open-settings", async () => {
    if (process.platform === "darwin") {
      await shell.openExternal(
        "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture",
      );
      return true;
    }
    return false;
  });

  ipcMain.handle("screen:capture", async () => capturePrimaryScreen());

  ipcMain.handle("settings:getGeminiApiKey", () => getGeminiApiKey());
  ipcMain.handle("settings:setGeminiApiKey", (_event, key) => {
    const saved = setGeminiApiKey(key);
    return { saved: Boolean(saved), configured: Boolean(saved || getGeminiApiKey()) };
  });
}

app.whenReady().then(async () => {
  applyStoredKeyToEnv();
  registerIpc();
  await setupDisplayMediaHandler();
  registerAnalyzeHotkey();
  await createWindow();

  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});

app.on("before-quit", () => {
  if (nextProcess && !nextProcess.killed) {
    nextProcess.kill("SIGTERM");
    nextProcess = null;
  }
});
