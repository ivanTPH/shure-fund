import { getAgent } from "@/lib/getAgent";
import { runAgent } from "@/lib/openai";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const input = searchParams.get("input") || "Test the agent";

  const agent = getAgent(id);

  if (!agent) {
    return Response.json({ error: "Agent not found" }, { status: 404 });
  }

  const output = await runAgent(agent.prompt, input);

  return Response.json({
    id: agent.id,
    name: agent.name,
    output
  });
}
