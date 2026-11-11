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

function getGeminiApiKey() {
  const fromEnv = (process.env.GEMINI_API_KEY || "").trim();
  if (fromEnv) return fromEnv;
  const stored = readSettings().geminiApiKey;
  return typeof stored === "string" ? stored.trim() : "";
}

function setGeminiApiKey(key) {
  const value = typeof key === "string" ? key.trim() : "";
  const current = readSettings();
  if (value) current.geminiApiKey = value;
  else delete current.geminiApiKey;
  writeSettings(current);
  if (value) process.env.GEMINI_API_KEY = value;
  else delete process.env.GEMINI_API_KEY;
  return value;
}

function getOpenAIApiKey() {
  const fromEnv = (process.env.OPENAI_API_KEY || "").trim();
  if (fromEnv) return fromEnv;
  const settings = readSettings();
  const stored = settings.openaiApiKey || settings.apiKey;
  return typeof stored === "string" ? stored.trim() : "";
}

function applyStoredKeyToEnv() {
  process.env.FLAME_SETTINGS_PATH = settingsPath();
  const gemini = getGeminiApiKey();
  if (gemini) process.env.GEMINI_API_KEY = gemini;
  const openai = getOpenAIApiKey();
  if (openai) process.env.OPENAI_API_KEY = openai;
  return { gemini, openai };
}

/** Prefer Gemini; used by UI "configured" checks. */
function getApiKey() {
  return getGeminiApiKey() || getOpenAIApiKey();
}

function setApiKey(key) {
  return setGeminiApiKey(key);
}

module.exports = {
  getGeminiApiKey,
  setGeminiApiKey,
  getOpenAIApiKey,
  getApiKey,
  setApiKey,
  applyStoredKeyToEnv,
  settingsPath,
};
