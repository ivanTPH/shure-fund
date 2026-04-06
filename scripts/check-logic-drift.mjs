import fs from "fs";
import path from "path";

const rootDir = process.cwd();
const scanRoot = path.join(rootDir, "src", "web-app", "lib");
const allowedLogicFile = path.join(scanRoot, "systemState.ts");
const ignoredFiles = new Set([
  allowedLogicFile,
  path.join(scanRoot, "shureFundModels.ts"),
  path.join(scanRoot, "demoData.ts"),
  path.join(scanRoot, "icons.ts"),
  path.join(scanRoot, "designSystem.ts"),
  path.join(scanRoot, "actionConfig.ts"),
  path.join(scanRoot, "priorityConfig.ts"),
  path.join(scanRoot, "statusConfig.ts"),
]);
const suspiciousPatterns = [
  /export function /,
  /\bgetFundingSummary\b/,
  /\bgetActionQueue\b/,
  /\bgetReleaseDecision[s]?\b/,
  /\bgetStageBlockers\b/,
  /\breleaseStage\b/,
  /\bgiveApproval\b/,
  /\bdepositFunds\b/,
  /\ballocateStageFunds\b/,
  /\bappendAuditLog\b/,
  /\breconcileSystemState\b/,
];

function collectFiles(directory) {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") {
        continue;
      }

      files.push(...collectFiles(fullPath));
      continue;
    }

    if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
      files.push(fullPath);
    }
  }

  return files;
}

const warnings = collectFiles(scanRoot)
  .filter((filePath) => !ignoredFiles.has(filePath))
  .filter((filePath) => suspiciousPatterns.some((pattern) => pattern.test(fs.readFileSync(filePath, "utf-8"))))
  .map((filePath) => path.relative(rootDir, filePath));

if (warnings.length === 0) {
  console.log("Logic drift check: no obvious business-logic drift detected outside src/web-app/lib/systemState.ts");
  process.exit(0);
}

console.warn("Logic drift check: possible business logic found outside src/web-app/lib/systemState.ts");
for (const warning of warnings) {
  console.warn(`- ${warning}`);
}

process.exit(0);
