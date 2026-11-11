import { openAIBaseUrl, openAIModel } from "@/lib/env";
import { ModelError } from "@/lib/model-error";
import { messageText, normalizeSolution, parseModelJson } from "@/lib/normalize";
import { SYSTEM_PROMPT, userPrompt } from "@/lib/prompt";
import type { Solution, SubjectChoice } from "@/lib/types";

export { ModelError };

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
      "The Flame Tool couldn’t reach OpenAI. Check the network and OPENAI_BASE_URL.",
      502,
    );
  }

  if (!response.ok) {
    console.error("OpenAI request failed", response.status);
    if (response.status === 401) {
      throw new ModelError(
        "OpenAI rejected the API key. Check OPENAI_API_KEY, or use a free Gemini key instead.",
        401,
      );
    }
    if (response.status === 429) {
      throw new ModelError("OpenAI is rate-limiting requests. Wait a moment and try again.", 429);
    }
    throw new ModelError(
      hasImage
        ? "The model couldn’t read that frame. Try a tighter crop or type the problem."
        : "The model couldn’t answer that. Try again in a moment.",
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

  const fallback =
    input.problem?.trim() || (hasImage ? "Problem in a screen capture or photo" : "Problem");
  const solution = normalizeSolution(parsed, fallback);
  if (!solution) {
    throw new ModelError("The model sent an unexpected reply. Try again.", 502);
  }
  return solution;
}
