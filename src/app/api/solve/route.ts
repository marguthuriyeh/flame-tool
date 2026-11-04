import { openAIKey } from "@/lib/env";
import { mockSolve } from "@/lib/mock-solver";
import { ModelError, solveWithOpenAI } from "@/lib/openai";
import { isSubjectChoice, type SubjectChoice } from "@/lib/types";
import { connection } from "next/server";

const MAX_PROBLEM = 4000;
const MAX_IMAGE = 1_800_000;

export async function POST(request: Request) {
  await connection();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("That request was empty or too large to read.", 400);
  }

  if (!body || typeof body !== "object") {
    return jsonError("Add a problem, or Analyze a screen that shows one.", 400);
  }

  const record = body as Record<string, unknown>;
  const subject: SubjectChoice = isSubjectChoice(record.subject) ? record.subject : "Auto";
  const problem = typeof record.problem === "string" ? record.problem.trim() : "";
  const image = typeof record.image === "string" ? record.image.trim() : "";
  const sample = record.sample === true;

  if (problem.length > MAX_PROBLEM) {
    return jsonError("That problem is too long. Keep it under 4,000 characters.", 400);
  }
  if (image) {
    if (!/^data:image\/(jpeg|jpg|png|webp);base64,/i.test(image)) {
      return jsonError("The image has to be a JPEG, PNG, or WEBP.", 400);
    }
    if (image.length > MAX_IMAGE) {
      return jsonError("That image is too large. Crop it or try a smaller photo.", 413);
    }
  }
  if (!problem && !image) {
    return jsonError("Add a problem, or Analyze a screen that shows one.", 400);
  }

  const key = openAIKey();
  try {
    const solution = key
      ? await solveWithOpenAI({
          key,
          subject,
          problem: problem || undefined,
          image: image || undefined,
        })
      : mockSolve({
          problem,
          subject,
          sample,
          hasImage: Boolean(image),
        });

    return Response.json(
      { solution, mock: !key, configured: Boolean(key) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof ModelError) {
      return jsonError(error.message, error.status);
    }
    console.error("solve failed", error instanceof Error ? error.name : "unknown");
    return jsonError("The Flame Tool couldn't get an answer. Try again.", 500);
  }
}

function jsonError(error: string, status: number) {
  return Response.json(
    { error },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}
