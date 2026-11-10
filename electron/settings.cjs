const fs = require("fs");
const os = require("os");
const path = require("path");

function settingsPath() {
  if (process.env.FLAME_SETTINGS_PATH) return process.env.FLAME_SETTINGS_PATH;
  return path.join(os.homedir(), ".flame-tool", "settings.json");
}

function readSettings() {
  try {
    const raw = fs.readFileSync(settingsPath(), "utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeSettings(next) {
  const file = settingsPath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(next, null, 2), "utf8");
}

function getApiKey() {
  const fromEnv = (process.env.OPENAI_API_KEY || "").trim();
  if (fromEnv) return fromEnv;
  const stored = readSettings().apiKey;
  return typeof stored === "string" ? stored.trim() : "";
}

function setApiKey(key) {
  const value = typeof key === "string" ? key.trim() : "";
  const current = readSettings();
  if (value) current.apiKey = value;
  else delete current.apiKey;
  writeSettings(current);
  if (value) process.env.OPENAI_API_KEY = value;
  else delete process.env.OPENAI_API_KEY;
  return value;
}

function applyStoredKeyToEnv() {
  process.env.FLAME_SETTINGS_PATH = settingsPath();
  const key = getApiKey();
  if (key) process.env.OPENAI_API_KEY = key;
  return key;
}

module.exports = {
  getApiKey,
  setApiKey,
  applyStoredKeyToEnv,
  settingsPath,
};
