import { openAIKey } from "@/lib/env";
import { connection } from "next/server";

export async function GET() {
  await connection();
  return Response.json(
    { configured: Boolean(openAIKey()) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
