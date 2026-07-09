import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { basename } from "node:path";

const files = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter(Boolean)
  .filter((file) => existsSync(file) && statSync(file).isFile());

const sensitiveEnvFile = (file) => {
  const name = basename(file);
  return name.startsWith(".env") && name !== ".env.example";
};

const patterns = [
  { name: "private-key", pattern: /-----BEGIN (?:RSA |EC |OPENSSH |)?PRIVATE KEY-----/i },
  { name: "aws-access-key", pattern: /AKIA[0-9A-Z]{16}/ },
  { name: "provider-api-key", pattern: /\bsk-[A-Za-z0-9_-]{20,}\b/ },
  { name: "database-url", pattern: /\b(?:postgres(?:ql)?|mysql|mongodb|redis|neo4j(?:\+s)?)\:\/\/(?!<)[^\s"']+/i },
  { name: "public-sensitive-env", pattern: /\bNEXT_PUBLIC_[A-Z0-9_]*(?:SECRET|TOKEN|KEY|AI|MODEL|PROVIDER)[A-Z0-9_]*\b/ },
  {
    name: "assigned-secret",
    pattern:
      /\b(?:api[_-]?key|secret|token|password|private[_-]?key)\b\s*[:=]\s*["']?(?![<$]|\{|\(|process\.env|this\.|server-only|generate-outside-git|local-development-placeholder|ci-placeholder|placeholder|restricted|vault:\/\/)([A-Za-z0-9_./+=-]{16,})/i,
  },
];

const findings = [];

function matches(pattern, content) {
  const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
  return [...content.matchAll(new RegExp(pattern.source, flags))].map((match) => match[0]);
}

function allowedPlaceholder(value) {
  return [
    "ci-placeholder",
    "<server-only",
    "<generate-outside-git>",
    "local-development-placeholder",
    "placeholder",
    "redis://redis:6379",
    "bolt://neo4j:7687",
    "@postgres:5432/african_guard_ci",
  ].some((allowed) => value.includes(allowed));
}

for (const file of files) {
  if (sensitiveEnvFile(file)) {
    findings.push({ file, name: "tracked-sensitive-env-file" });
    continue;
  }

  let content = "";
  try {
    content = readFileSync(file, "utf8");
  } catch {
    continue;
  }

  for (const { name, pattern } of patterns) {
    if (matches(pattern, content).some((value) => !allowedPlaceholder(value))) findings.push({ file, name });
  }
}

if (findings.length > 0) {
  console.error("Secret scan failed. Findings are listed by file and rule only; values are not printed.");
  for (const finding of findings) console.error(`- ${finding.file}: ${finding.name}`);
  process.exit(1);
}

console.log(`Secret scan passed across ${files.length} tracked files.`);
