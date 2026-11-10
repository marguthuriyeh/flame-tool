import type { Solution } from "@/lib/types";

const SUBJECTS = new Set([
  "Math",
  "Physics",
  "Chemistry",
  "Biology",
  "History",
  "English",
  "General",
]);

function clip(value: string, max: number): string {
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

export function parseModelJson(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(trimmed);
}

export function normalizeSolution(raw: unknown, fallbackProblem: string): Solution | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const answer = typeof record.answer === "string" ? clip(record.answer, 2000) : "";
  if (!answer) return null;
  const problemText =
    typeof record.problemText === "string" && record.problemText.trim()
      ? clip(record.problemText, 500)
      : clip(fallbackProblem, 500);
  const detected =
    typeof record.detectedSubject === "string" ? record.detectedSubject.trim() : "General";
  return {
    detectedSubject: SUBJECTS.has(detected) ? detected : "General",
    problemText: problemText || "Problem",
    answer,
  };
}

export function messageText(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((part) => {
      if (typeof part === "string") return part;
      if (part && typeof part === "object" && "text" in part) {
        const text = (part as { text?: unknown }).text;
        return typeof text === "string" ? text : "";
      }
      return "";
    })
    .join("");
}
