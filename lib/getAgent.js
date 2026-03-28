import { agents } from "../agents/registry";
import fs from "fs";
import path from "path";

export function getAgent(id) {
  const agent = agents.find((a) => a.id === id);
  if (!agent) return null;

  const promptPath = path.join(process.cwd(), "prompts", `${id}.md`);
  const prompt = fs.readFileSync(promptPath, "utf-8");

  return {
    ...agent,
    prompt
  };
}
