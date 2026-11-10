export const SUBJECTS = [
  "Auto",
  "Math",
  "Physics",
  "Chemistry",
  "Biology",
  "History",
  "English",
] as const;

export type SubjectChoice = (typeof SUBJECTS)[number];

export type Source = "text" | "capture" | "upload" | "sample";

export type Solution = {
  detectedSubject: string;
  problemText: string;
  answer: string;
};

export type HistoryItem = {
  id: string;
  createdAt: number;
  source: Source;
  mock: boolean;
  solution: Solution;
};

export type SolveResult = {
  solution: Solution;
  mock: boolean;
  configured: boolean;
};

export function isSubjectChoice(value: unknown): value is SubjectChoice {
  return typeof value === "string" && (SUBJECTS as readonly string[]).includes(value);
}
