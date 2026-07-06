import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("backend exposes enterprise integration and investigation endpoints", () => {
  const controller = read("services/api/src/app.controller.ts");
  for (const route of [
    "integrations",
    "transactions/ingest",
    "developer/api-keys",
    "osint/identity-search",
    "evidence/capture",
    "audit/export",
    "openapi.json",
  ]) {
    assert.match(controller, new RegExp(route.replace("/", "\\/")));
  }
});

test("frontend includes required enterprise SaaS workspaces", () => {
  const panel = read("apps/web/src/components/EnterprisePlatformPanel.tsx");
  for (const label of ["Integrations", "Transactions", "OSINT", "Evidence", "Developer", "Compliance", "Audit"]) {
    assert.match(panel, new RegExp(label));
  }
});

test("AI scoring includes advanced device and behavior signals", () => {
  const ai = read("services/ai/app/main.py");
  for (const feature of ["device_fingerprint_reuse", "bot_score", "remote_access_tool", "deepfake_risk", "session_entropy"]) {
    assert.match(ai, new RegExp(feature));
  }
});

test("integration adapter contract includes required lifecycle methods", () => {
  const adapters = read("services/api/src/modules/integrations-service/adapters.ts");
  for (const method of ["authenticate", "pullTransactions", "receiveWebhook", "mapSchema", "rateLimit"]) {
    assert.match(adapters, new RegExp(method));
  }
});
