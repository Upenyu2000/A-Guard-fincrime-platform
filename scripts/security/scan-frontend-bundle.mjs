import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const roots = [
  "apps/web/.next/static",
  "apps/web/.next/server/app",
];

const scannedExtensions = new Set([".js", ".css", ".html", ".rsc", ".map", ".txt"]);
const prohibited = [
  { name: "private-key", pattern: /-----BEGIN (?:RSA |EC |OPENSSH |)?PRIVATE KEY-----/i },
  { name: "api-key", pattern: /\bsk-[A-Za-z0-9_-]{20,}\b/ },
  { name: "database-url", pattern: /\b(?:postgres(?:ql)?|mysql|mongodb|redis|neo4j(?:\+s)?)\:\/\/[^\s"']+/i },
  { name: "internal-risk-url", pattern: /\b(?:AI_SERVICE_URL|AI_SERVICE_TOKEN|MODEL_REGISTRY_URL|MODEL_REGISTRY_TOKEN)\b/ },
  { name: "server-secret-env", pattern: /\b(?:DATABASE_URL|REDIS_URL|KAFKA_PASSWORD|NEO4J_PASSWORD|JWT_SECRET|FIELD_ENCRYPTION_KEY|SANCTIONS_PROVIDER_KEY|PEP_PROVIDER_KEY|IDENTITY_PROVIDER_KEY)\b/ },
  { name: "public-sensitive-env", pattern: /\bNEXT_PUBLIC_[A-Z0-9_]*(?:SECRET|TOKEN|KEY|AI|MODEL|PROVIDER)[A-Z0-9_]*\b/ },
  { name: "provider-or-framework-name", pattern: /\b(?:OpenAI|Gemini|Anthropic|Ollama|Llama|TensorFlow|PyTorch|FastAPI)\b/ },
  { name: "internal-service-host", pattern: /\b(?:http:\/\/ai:8001|localhost:8001|127\.0\.0\.1:8001)\b/ },
];

const files = [];

function extension(file) {
  const index = file.lastIndexOf(".");
  return index === -1 ? "" : file.slice(index);
}

function walk(path) {
  if (!existsSync(path)) return;
  const stat = statSync(path);
  if (stat.isDirectory()) {
    for (const child of readdirSync(path)) walk(join(path, child));
    return;
  }
  if (scannedExtensions.has(extension(path))) files.push(path);
}

for (const root of roots) walk(root);

if (files.length === 0) {
  console.error("Frontend bundle scan found no built assets. Run the production web build before this check.");
  process.exit(1);
}

const findings = [];
for (const file of files) {
  let content = "";
  try {
    content = readFileSync(file, "utf8");
  } catch {
    continue;
  }
  for (const { name, pattern } of prohibited) {
    if (pattern.test(content)) findings.push({ file, name });
  }
}

if (findings.length > 0) {
  console.error("Frontend bundle scan failed. Findings are listed by file and rule only; values are not printed.");
  for (const finding of findings) console.error(`- ${finding.file}: ${finding.name}`);
  process.exit(1);
}

console.log(`Frontend bundle scan passed across ${files.length} generated assets.`);
