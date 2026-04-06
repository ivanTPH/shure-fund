import fs from "fs";
import path from "path";

import { agents } from "../agents/registry.js";

const DOCS_DIR = path.join(process.cwd(), "shure_fund_docs");
const PROMPTS_DIR = path.join(process.cwd(), "prompts");

function readRequiredFile(filePath, label) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing required ${label}: ${filePath}`);
  }

  return fs.readFileSync(filePath, "utf-8");
}

export function getAgent(id) {
  const agent = agents.find((candidate) => candidate.id === id);

  if (!agent) {
    return null;
  }

  const promptPath = path.join(PROMPTS_DIR, agent.promptFile);
  const prompt = readRequiredFile(promptPath, "prompt file");
  const sourceOfTruth = Object.fromEntries(
    agent.requiredDocs.map((docName) => {
      const docPath = path.join(DOCS_DIR, docName);
      return [
        docName,
        {
          path: docPath,
          content: readRequiredFile(docPath, "source-of-truth document"),
        },
      ];
    }),
  );

  return {
    ...agent,
    prompt,
    sourceOfTruth,
  };
}
