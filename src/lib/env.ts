export function openAIKey(): string | null {
  const key = process.env.OPENAI_API_KEY?.trim() ?? "";
  return key.length > 0 ? key : null;
}

export function openAIModel(): string {
  return process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
}

export function openAIBaseUrl(): string {
  const raw = process.env.OPENAI_BASE_URL?.trim() || "https://api.openai.com/v1";
  return raw.replace(/\/+$/, "");
}
