import { EXAMPLES } from "@/lib/examples";
import type { Solution, SubjectChoice } from "@/lib/types";

export function mockSolve(input: {
  problem?: string;
  subject: SubjectChoice;
  sample?: boolean;
  hasImage?: boolean;
}): Solution {
  if (input.sample) {
    const quadratic = EXAMPLES.find((example) => example.id === "quadratic");
    if (quadratic) {
      return {
        detectedSubject: quadratic.subject,
        problemText: quadratic.problemText,
        answer: quadratic.answer,
      };
    }
  }

  const text = (input.problem ?? "").trim();
  if (input.hasImage && text.length === 0) {
    return {
      detectedSubject: input.subject === "Auto" ? "General" : input.subject,
      problemText: "Problem in a screen capture or photo",
      answer:
        "Demo mode can't read a picture. Add a free Gemini API key (GEMINI_API_KEY or settings), then Analyze again.",
    };
  }

  const haystack = text.toLowerCase().replace(/\s+/g, " ");
  const match = EXAMPLES.find((example) =>
    example.tests.some((test) => haystack.includes(test)),
  );
  if (match) {
    return {
      detectedSubject: match.subject,
      problemText: match.problemText,
      answer: match.answer,
    };
  }

  return {
    detectedSubject: input.subject === "Auto" ? "General" : input.subject,
    problemText: text.slice(0, 280) || "Problem",
    answer:
      "Demo mode only has sample answers for the built-in examples. Add a free Gemini API key from https://aistudio.google.com/apikey.",
  };
}
