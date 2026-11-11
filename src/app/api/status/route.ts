import { resolveProvider } from "@/lib/env";
import { connection } from "next/server";

export async function GET() {
  await connection();
  const { provider } = resolveProvider();
  return Response.json(
    {
      configured: Boolean(provider),
      provider: provider ?? "demo",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
