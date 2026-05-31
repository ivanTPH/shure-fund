/**
 * agents/loader.mjs
 *
 * Loads an agent's full system prompt (prompt file + required docs).
 *
 * CLI usage:
 *   node agents/loader.mjs <agent-id>
 *   node agents/loader.mjs builder
 *   node agents/loader.mjs --list
 *
 * Programmatic usage:
 *   import { loadAgent, listAgents } from './agents/loader.mjs';
 *   const { systemPrompt } = await loadAgent('funding_assurance');
 */

import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROMPTS_DIR = resolve(__dirname, "prompts");
const DOCS_DIR    = resolve(__dirname, "../shure_fund_docs");

// ---------------------------------------------------------------------------
// Agent registry (mirrors registry.js — kept in sync manually)
// ---------------------------------------------------------------------------

const AGENTS = [
  {
    id: "builder",
    name: "Builder Agent",
    description: "Implements code changes that align with the product source of truth.",
    promptFile: "builder.md",
    requiredDocs: [
      "ShureFund_SoT_v3.md",
      "ShureFund_MVP_Scope_and_Target_State_v1.md",
      "ShureFund_Data_Model_v2_1.md",
      "ShureFund_Control_Logic_v2_1.md",
      "ShureFund_Workflow_State_Machine_v1.md",
    ],
  },
  {
    id: "code_assurance",
    name: "Code Assurance Agent",
    description: "Reviews code quality, drift risk, and merge readiness.",
    promptFile: "code-assurance.md",
    requiredDocs: [
      "ShureFund_SoT_v3.md",
      "ShureFund_Control_Logic_v2_1.md",
      "ShureFund_Data_Model_v2_1.md",
      "ShureFund_Workflow_State_Machine_v1.md",
      "ShureFund_Audit_and_Event_Model_v1.md",
    ],
  },
  {
    id: "workflow_ux",
    name: "Workflow / UX Agent",
    description: "Protects workflow clarity, status visibility, and mobile-first UX.",
    promptFile: "workflow-ux.md",
    requiredDocs: [
      "ShureFund_SoT_v3.md",
      "ShureFund_Workflow_State_Machine_v1.md",
    ],
  },
  {
    id: "funding_assurance",
    name: "Funding Assurance Agent",
    description: "Owns funding integrity, ledger reasoning, and release eligibility checks.",
    promptFile: "funding-assurance.md",
    requiredDocs: [
      "ShureFund_SoT_v3.md",
      "ShureFund_Data_Model_v2_1.md",
      "ShureFund_Control_Logic_v2_1.md",
      "ShureFund_MVP_Scope_and_Target_State_v1.md",
    ],
  },
  {
    id: "compliance_audit",
    name: "Compliance / Audit Agent",
    description: "Owns compliance posture, audit completeness, and control evidence.",
    promptFile: "compliance-audit.md",
    requiredDocs: [
      "ShureFund_SoT_v3.md",
      "ShureFund_Audit_and_Event_Model_v1.md",
    ],
  },
  {
    id: "brand_guardian",
    name: "Brand Guardian Agent",
    description: "Protects tone, visual identity, and risk-forward presentation.",
    promptFile: "brand-guardian.md",
    requiredDocs: [
      "ShureFund_SoT_v3.md",
    ],
  },
];

// ---------------------------------------------------------------------------
// Loader
// ---------------------------------------------------------------------------

/**
 * Returns all agent definitions (no file I/O).
 */
export function listAgents() {
  return AGENTS.map(({ id, name, description }) => ({ id, name, description }));
}

/**
 * Loads an agent by id.
 * Returns { agent, systemPrompt } where systemPrompt is the prompt file
 * followed by each readable .md doc, separated by hr lines.
 *
 * Docs that are .docx or missing are skipped silently.
 */
export function loadAgent(id) {
  const agent = AGENTS.find((a) => a.id === id);
  if (!agent) {
    const ids = AGENTS.map((a) => a.id).join(", ");
    throw new Error(`Unknown agent id "${id}". Available: ${ids}`);
  }

  const promptPath = resolve(PROMPTS_DIR, agent.promptFile);
  if (!existsSync(promptPath)) {
    throw new Error(`Prompt file not found: ${promptPath}`);
  }

  const parts = [readFileSync(promptPath, "utf8").trim()];

  for (const docName of agent.requiredDocs) {
    // Only load .md docs — skip .docx (binary)
    if (!docName.endsWith(".md")) continue;
    const docPath = resolve(DOCS_DIR, docName);
    if (!existsSync(docPath)) continue;
    const content = readFileSync(docPath, "utf8").trim();
    parts.push(`\n---\n## Reference: ${docName}\n\n${content}`);
  }

  return { agent, systemPrompt: parts.join("\n") };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const arg = process.argv[2];

  if (!arg || arg === "--list") {
    console.log("Available agents:\n");
    for (const { id, name, description } of listAgents()) {
      console.log(`  ${id.padEnd(20)} ${name}`);
      console.log(`  ${"".padEnd(20)} ${description}\n`);
    }
    console.log("Usage: node agents/loader.mjs <agent-id>");
    process.exit(0);
  }

  try {
    const { agent, systemPrompt } = loadAgent(arg);
    console.error(`[loader] ${agent.name} — ${systemPrompt.length} chars\n`);
    process.stdout.write(systemPrompt);
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}
