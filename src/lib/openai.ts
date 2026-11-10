import { openAIBaseUrl, openAIModel } from "@/lib/env";
import { messageText, normalizeSolution, parseModelJson } from "@/lib/normalize";
import type { Solution, SubjectChoice } from "@/lib/types";

const SYSTEM_PROMPT = `You are The Flame Tool, an assistant for high-school schoolwork.

Return only the final answer. Never include steps, worked solutions, reasoning, explanations, checks, teaching notes, or encouragement.

Respond with a single JSON object and nothing else:
{
  "detectedSubject": "Math" | "Physics" | "Chemistry" | "Biology" | "History" | "English" | "General",
  "problemText": "one-sentence restatement of the question only",
  "answer": "the final answer only"
}

Rules for answer:
- No preamble such as "The answer is" or "Final answer".
- No numbered steps and no explanation of how the result was reached.
- Use $...$ for inline math and $$...$$ for display math. Do not use \\( \\) or \\[ \\].
- Write money amounts in words so dollar signs stay reserved for math.
- If several questions are visible, give each final answer labeled with its number, still with no work shown.
- If a screen image is unreadable or cut off, say what could not be read instead of guessing.
- If the request is not schoolwork, set answer to "The Flame Tool only answers school problems."

problemText restates the question and must not contain the answer.`;

export class ModelError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ModelError";
    this.status = status;
  }
}

function userPrompt(subject: SubjectChoice, problem?: string, hasImage?: boolean): string {
  const hint = `Subject hint: ${subject}.`;
  if (hasImage && problem) {
    return `${hint}\nThe student sent a photo or screen capture and this note:\n${problem}\nRead the schoolwork in the image and return only the final answer.`;
  }
  if (hasImage) {
    return `${hint}\nThe student sent a photo or screen capture. Read the schoolwork in the image and return only the final answer. Ignore unrelated parts of the screen.`;
  }
  return `${hint}\nThe student typed this problem:\n${problem ?? ""}`;
}

export async function solveWithOpenAI(input: {
  key: string;
  problem?: string;
  image?: string;
  subject: SubjectChoice;
}): Promise<Solution> {
  const hasImage = Boolean(input.image);
  const content: Array<
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string } }
  > = [{ type: "text", text: userPrompt(input.subject, input.problem, hasImage) }];

  if (input.image) {
    content.push({ type: "image_url", image_url: { url: input.image } });
  }

  let response: Response;
  try {
    response = await fetch(`${openAIBaseUrl()}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.key}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(45_000),
      body: JSON.stringify({
        model: openAIModel(),
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content },
        ],
      }),
    });
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    if (name === "TimeoutError" || name === "AbortError") {
      throw new ModelError("That took too long. Try a smaller crop or a shorter problem.", 504);
    }
    throw new ModelError(
      "The Flame Tool couldn't reach the model. Check the network and OPENAI_BASE_URL.",
      502,
    );
  }

  if (!response.ok) {
    console.error("OpenAI request failed", response.status);
    if (response.status === 401) {
      throw new ModelError("The API key was rejected. Check OPENAI_API_KEY in .env.local.", 401);
    }
    if (response.status === 429) {
      throw new ModelError("The model is rate-limiting requests. Wait a moment and try again.", 429);
    }
    throw new ModelError(
      hasImage
        ? "The model couldn't read that frame. Try a tighter crop or type the problem."
        : "The model couldn't answer that. Try again in a moment.",
      502,
    );
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: unknown } }>;
  };
  const text = messageText(payload.choices?.[0]?.message?.content);
  let parsed: unknown;
  try {
    parsed = parseModelJson(text);
  } catch {
    throw new ModelError("The model sent an unexpected reply. Try again.", 502);
  }

  const fallback = input.problem?.trim() || (hasImage ? "Problem in a screen capture or photo" : "Problem");
  const solution = normalizeSolution(parsed, fallback);
  if (!solution) {
    throw new ModelError("The model sent an unexpected reply. Try again.", 502);
  }
  return solution;
}
