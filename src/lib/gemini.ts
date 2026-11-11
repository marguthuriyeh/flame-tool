import { geminiBaseUrl, geminiModel } from "@/lib/env";
import { ModelError } from "@/lib/model-error";
import { normalizeSolution, parseModelJson } from "@/lib/normalize";
import { SYSTEM_PROMPT, userPrompt } from "@/lib/prompt";
import type { Solution, SubjectChoice } from "@/lib/types";

function splitDataUrl(image: string): { mime: string; data: string } | null {
  const match = /^data:(image\/(?:jpeg|jpg|png|webp));base64,(.+)$/i.exec(image.trim());
  if (!match) return null;
  const mime = match[1].toLowerCase() === "image/jpg" ? "image/jpeg" : match[1].toLowerCase();
  return { mime, data: match[2] };
}

function extractText(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const candidates = (payload as { candidates?: unknown }).candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) return "";
  const content = (candidates[0] as { content?: { parts?: unknown } } | undefined)?.content;
  const parts = content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts
    .map((part) => {
      if (!part || typeof part !== "object") return "";
      const text = (part as { text?: unknown }).text;
      return typeof text === "string" ? text : "";
    })
    .join("");
}

function friendlyGeminiHttpError(status: number, bodyText: string, hasImage: boolean): ModelError {
  const lower = bodyText.toLowerCase();
  if (status === 400 && (lower.includes("api key") || lower.includes("api_key"))) {
    return new ModelError(
      "That Gemini API key looks invalid. Get a free key at https://aistudio.google.com/apikey and paste it in settings.",
      401,
    );
  }
  if (status === 401 || status === 403) {
    return new ModelError(
      "Gemini rejected the API key. Check GEMINI_API_KEY or the key saved in settings. Free keys come from https://aistudio.google.com/apikey.",
      401,
    );
  }
  if (status === 429) {
    return new ModelError(
      "Gemini’s free tier is rate-limiting right now. Wait a minute and try Analyze again.",
      429,
    );
  }
  if (status === 404) {
    return new ModelError(
      "That Gemini model wasn’t found. Check GEMINI_MODEL (default is gemini-2.5-flash-lite).",
      502,
    );
  }
  return new ModelError(
    hasImage
      ? "Gemini couldn’t read that frame. Try a tighter crop or type the problem."
      : "Gemini couldn’t answer that. Try again in a moment.",
    502,
  );
}

export async function solveWithGemini(input: {
  key: string;
  problem?: string;
  image?: string;
  subject: SubjectChoice;
}): Promise<Solution> {
  const hasImage = Boolean(input.image);
  const parts: Array<Record<string, unknown>> = [
    { text: userPrompt(input.subject, input.problem, hasImage) },
  ];

  if (input.image) {
    const split = splitDataUrl(input.image);
    if (!split) {
      throw new ModelError("The image has to be a JPEG, PNG, or WEBP.", 400);
    }
    parts.push({
      inlineData: {
        mimeType: split.mime,
        data: split.data,
      },
    });
  }

  const url = `${geminiBaseUrl()}/models/${encodeURIComponent(geminiModel())}:generateContent`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": input.key,
      },
      signal: AbortSignal.timeout(60_000),
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: SYSTEM_PROMPT }],
        },
        contents: [{ role: "user", parts }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json",
        },
      }),
    });
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    if (name === "TimeoutError" || name === "AbortError") {
      throw new ModelError("That took too long. Try a smaller crop or a shorter problem.", 504);
    }
    throw new ModelError(
      "The Flame Tool couldn’t reach Gemini. Check your network connection and try again.",
      502,
    );
  }

  const bodyText = await response.text();
  if (!response.ok) {
    console.error("Gemini request failed", response.status);
    throw friendlyGeminiHttpError(response.status, bodyText, hasImage);
  }

  let payload: unknown;
  try {
    payload = JSON.parse(bodyText);
  } catch {
    throw new ModelError("Gemini sent an unexpected reply. Try again.", 502);
  }

  const blockReason = (payload as { promptFeedback?: { blockReason?: string } })?.promptFeedback
    ?.blockReason;
  if (blockReason) {
    throw new ModelError(
      "Gemini blocked that request. Try a clearer crop of just the schoolwork.",
      400,
    );
  }

  const text = extractText(payload);
  let parsed: unknown;
  try {
    parsed = parseModelJson(text);
  } catch {
    throw new ModelError("Gemini sent an unexpected reply. Try again.", 502);
  }

  const fallback =
    input.problem?.trim() || (hasImage ? "Problem in a screen capture or photo" : "Problem");
  const solution = normalizeSolution(parsed, fallback);
  if (!solution) {
    throw new ModelError("Gemini sent an unexpected reply. Try again.", 502);
  }
  return solution;
}
