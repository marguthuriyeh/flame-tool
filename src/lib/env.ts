import { existsSync, readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

function settingsFilePath(): string {
  return process.env.FLAME_SETTINGS_PATH?.trim() || join(homedir(), ".flame-tool", "settings.json");
}

function keyFromSettingsFile(): string | null {
  const file = settingsFilePath();
  if (!existsSync(/*turbopackIgnore: true*/ file)) return null;
  try {
    const parsed = JSON.parse(readFileSync(/*turbopackIgnore: true*/ file, "utf8")) as {
      apiKey?: unknown;
    };
    const key = typeof parsed.apiKey === "string" ? parsed.apiKey.trim() : "";
    return key.length > 0 ? key : null;
  } catch {
    return null;
  }
}

export function openAIKey(): string | null {
  const fromEnv = process.env.OPENAI_API_KEY?.trim() ?? "";
  if (fromEnv.length > 0) return fromEnv;
  return keyFromSettingsFile();
}

export function openAIModel(): string {
  return process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
}

export function openAIBaseUrl(): string {
  const raw = process.env.OPENAI_BASE_URL?.trim() || "https://api.openai.com/v1";
  return raw.replace(/\/+$/, "");
}
