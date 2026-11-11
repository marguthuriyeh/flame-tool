import { existsSync, readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

type SettingsFile = {
  geminiApiKey?: unknown;
  apiKey?: unknown;
  openaiApiKey?: unknown;
};

function settingsFilePath(): string {
  return process.env.FLAME_SETTINGS_PATH?.trim() || join(homedir(), ".flame-tool", "settings.json");
}

function readSettingsFile(): SettingsFile {
  const file = settingsFilePath();
  if (!existsSync(/*turbopackIgnore: true*/ file)) return {};
  try {
    const parsed = JSON.parse(readFileSync(/*turbopackIgnore: true*/ file, "utf8")) as SettingsFile;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function stringSetting(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function geminiKey(): string | null {
  const fromEnv = process.env.GEMINI_API_KEY?.trim() ?? "";
  if (fromEnv.length > 0) return fromEnv;
  return stringSetting(readSettingsFile().geminiApiKey);
}

export function openAIKey(): string | null {
  const fromEnv = process.env.OPENAI_API_KEY?.trim() ?? "";
  if (fromEnv.length > 0) return fromEnv;
  const settings = readSettingsFile();
  return stringSetting(settings.openaiApiKey) ?? stringSetting(settings.apiKey);
}

export type ModelProvider = "gemini" | "openai" | null;

/** Gemini wins when present; OpenAI is fallback only. */
export function resolveProvider(): { provider: ModelProvider; key: string | null } {
  const gemini = geminiKey();
  if (gemini) return { provider: "gemini", key: gemini };
  const openai = openAIKey();
  if (openai) return { provider: "openai", key: openai };
  return { provider: null, key: null };
}

export function geminiModel(): string {
  // Fastest free-tier multimodal model (vision). Override with GEMINI_MODEL if needed.
  return process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash-lite";
}

export function geminiBaseUrl(): string {
  const raw =
    process.env.GEMINI_BASE_URL?.trim() || "https://generativelanguage.googleapis.com/v1beta";
  return raw.replace(/\/+$/, "");
}

export function openAIModel(): string {
  return process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
}

export function openAIBaseUrl(): string {
  const raw = process.env.OPENAI_BASE_URL?.trim() || "https://api.openai.com/v1";
  return raw.replace(/\/+$/, "");
}
