import { fallbackPicture } from "./fallback";
import {
  AgentAction,
  AgentAutonomyMode,
  AgentOpsControlPlane,
  AgentRunResult,
  DeploymentReadiness,
  IntegrationConnection,
  OperatingPicture,
  OsintFinding,
  OsintInvestigationResult,
  RiskDecision,
  TransactionMonitoringRecord,
} from "./types";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "http://localhost:4000";
const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
const TOKEN_STORAGE_KEY = "african_guard_access_token";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly responseBody?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function setAccessToken(token: string): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function clearAccessToken(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(TOKEN_STORAGE_KEY);
}

export function getAccessToken(): string | undefined {
  if (typeof window !== "undefined") {
    return window.sessionStorage.getItem(TOKEN_STORAGE_KEY) ?? undefined;
  }
  return process.env.AFRICAN_GUARD_SERVER_ACCESS_TOKEN;
}

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getAccessToken();
  if (!token) {
    throw new ApiError("Not authenticated. Sign in through the configured identity provider.", 401);
  }

  const headers = new Headers(init.headers);
  headers.set("authorization", `Bearer ${token}`);
  if (init.body && !headers.has("content-type")) headers.set("content-type", "application/json");
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
    cache: init.cache ?? "no-store",
  });

  const contentType = response.headers.get("content-type") ?? "";
  const responseBody = contentType.includes("application/json")
    ? await response.json().catch(() => undefined)
    : await response.text().catch(() => undefined);

  if (!response.ok) {
    throw new ApiError(`API request failed with status ${response.status}.`, response.status, responseBody);
  }
  return responseBody as T;
}

function requireDemoMode(action: string): void {
  if (!DEMO_MODE) {
    throw new ApiError(`${action} is available only when NEXT_PUBLIC_DEMO_MODE=true.`);
  }
}

export async function fetchOperatingPicture(): Promise<OperatingPicture> {
  try {
    return await apiFetch<OperatingPicture>("/v1/operating-picture");
  } catch (error) {
    if (DEMO_MODE) return fallbackPicture;
    throw error;
  }
}

export async function recallPayment(id: string) {
  return apiFetch<unknown>(`/v1/payments/${encodeURIComponent(id)}/recall`, { method: "POST" });
}

export async function scoreSyntheticEvent(): Promise<RiskDecision> {
  requireDemoMode("Synthetic scoring");
  return apiFetch<RiskDecision>("/v1/events/score", {
    method: "POST",
    body: JSON.stringify({
      event_type: "transaction",
      user_id: `manual-${crypto.randomUUID()}`,
      institution_id: "inst-demo",
      amount: 128000,
      currency: "USD",
      account_id: "acct-demo",
      device_id: "dev-demo",
      country: "NG",
      channel: "mobile",
      signals: {
        amount_zscore: 5.8,
        velocity_5m: 8,
        velocity_24h: 22,
        device_age_hours: 1.4,
        device_reputation: 83,
        device_fingerprint_reuse: 9,
        ip_risk: 77,
        geo_velocity_kmh: 1200,
        account_age_days: 8,
        email_risk: 71,
        phone_risk: 64,
        behavior_deviation: 88,
        bot_score: 82,
        remote_access_tool: true,
        deepfake_risk: 52,
        session_entropy: 22,
        beneficiary_risk: 84,
        graph_risk: 81,
        consortium_hits: 2,
        blacklist_confidence: 76,
        aml_risk: 69,
        payment_delay_seconds: 820,
      },
    }),
  });
}

export async function chatCase(caseId: string, prompt: string) {
  return apiFetch<{ answer: string; citations: string[] }>(
    `/v1/cases/${encodeURIComponent(caseId)}/chat`,
    { method: "POST", body: JSON.stringify({ prompt }) },
  );
}

export async function submitFeedback(caseId: string, label: string) {
  return apiFetch<unknown>("/v1/learning/feedback", {
    method: "POST",
    body: JSON.stringify({
      caseId,
      label,
      notes: "Label submitted from the African Guard operating console.",
    }),
  });
}

export async function runAgent(
  prompt: string,
  agentId?: string,
  entityName?: string,
): Promise<AgentRunResult> {
  return apiFetch<AgentRunResult>("/v1/agents/run", {
    method: "POST",
    body: JSON.stringify({ prompt, agentId, entityName }),
  });
}

export async function osintSearch(_entityName: string): Promise<OsintFinding> {
  throw new ApiError(
    "The legacy OSINT endpoint is disabled. Use a governed identity search with an active case, lawful basis, purpose, and approved sources.",
    410,
  );
}

export async function runAgentOpsCycle(): Promise<{
  run: AgentRunResult;
  action: AgentAction;
  controlPlane: AgentOpsControlPlane;
}> {
  return apiFetch("/v1/agentops/run-cycle", { method: "POST" });
}

export async function approveAgentAction(
  id: string,
): Promise<{ action: AgentAction; controlPlane: AgentOpsControlPlane }> {
  return apiFetch(`/v1/agentops/actions/${encodeURIComponent(id)}/approve`, { method: "POST" });
}

export async function setAgentAutonomy(mode: AgentAutonomyMode): Promise<AgentOpsControlPlane> {
  return apiFetch<AgentOpsControlPlane>("/v1/agentops/autonomy", {
    method: "POST",
    body: JSON.stringify({ mode }),
  });
}

export async function fetchDeploymentReadiness(): Promise<DeploymentReadiness> {
  return apiFetch<DeploymentReadiness>("/v1/deployment/readiness");
}

export async function testIntegration(
  id: string,
): Promise<{ integration: IntegrationConnection; result: string; checks: string[] }> {
  return apiFetch(`/v1/integrations/${encodeURIComponent(id)}/test`, { method: "POST" });
}

export async function ingestDemoTransaction(
  integrationId: string,
): Promise<{ record: TransactionMonitoringRecord; decision: RiskDecision }> {
  requireDemoMode("Demo transaction ingestion");
  return apiFetch("/v1/transactions/ingest", {
    method: "POST",
    body: JSON.stringify({
      integrationId,
      amount: 42000,
      currency: "USD",
      customerId: `demo-customer-${crypto.randomUUID()}`,
      merchantId: "mrc-demo",
      deviceId: "dev-demo-shared",
      ipAddress: "198.51.100.24",
      beneficiaryId: "ben-demo",
      signals: {
        velocity_5m: 6,
        device_reputation: 78,
        device_fingerprint_reuse: 8,
        bot_score: 84,
        remote_access_tool: true,
        session_entropy: 21,
        beneficiary_risk: 81,
        graph_risk: 77,
        consortium_hits: 2,
      },
    }),
  });
}

export interface LawfulOsintSearchInput {
  caseId: string;
  lawfulBasis: string;
  purpose: string;
  permissionLevel: "standard" | "enhanced" | "supervised";
  query: Record<string, unknown>;
}

export async function runLawfulOsintSearch(
  input?: LawfulOsintSearchInput,
): Promise<OsintInvestigationResult> {
  if (!input) {
    throw new ApiError(
      "A case ID, lawful basis, purpose, permission level, and search query are required.",
      400,
    );
  }
  return apiFetch<OsintInvestigationResult>("/v1/osint/identity-search", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
