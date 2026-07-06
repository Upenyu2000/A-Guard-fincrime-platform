import { fallbackPicture } from "./fallback";
import { AgentAction, AgentAutonomyMode, AgentOpsControlPlane, AgentRunResult, DeploymentReadiness, IntegrationConnection, OperatingPicture, OsintFinding, OsintInvestigationResult, RiskDecision, TransactionMonitoringRecord } from "./types";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "http://localhost:4000";

export async function fetchOperatingPicture(): Promise<OperatingPicture> {
  try {
    const response = await fetch(`${API_URL}/v1/operating-picture`, {
      cache: "no-store",
      headers: { "x-role": "admin" },
    });
    if (!response.ok) throw new Error(`API returned ${response.status}`);
    return (await response.json()) as OperatingPicture;
  } catch {
    return fallbackPicture;
  }
}

export async function recallPayment(id: string) {
  const response = await fetch(`${API_URL}/v1/payments/${id}/recall`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-role": "fraud_investigator",
      "x-actor": "console.user",
    },
  });
  if (!response.ok) throw new Error(`Recall failed with ${response.status}`);
  return response.json() as Promise<unknown>;
}

export async function scoreSyntheticEvent(): Promise<RiskDecision> {
  const response = await fetch(`${API_URL}/v1/events/score`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-role": "analyst",
    },
    body: JSON.stringify({
      event_type: "transaction",
      user_id: `manual-${Math.round(Math.random() * 9000)}`,
      institution_id: "inst-afb",
      amount: 128000,
      currency: "USD",
      account_id: "acct-console",
      device_id: "dev-console",
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
  if (!response.ok) throw new Error(`Scoring failed with ${response.status}`);
  return response.json() as Promise<RiskDecision>;
}

export async function chatCase(caseId: string, prompt: string) {
  const response = await fetch(`${API_URL}/v1/cases/${caseId}/chat`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-role": "fraud_investigator",
    },
    body: JSON.stringify({ prompt }),
  });
  if (!response.ok) throw new Error(`Chat failed with ${response.status}`);
  return response.json() as Promise<{ answer: string; citations: string[] }>;
}

export async function submitFeedback(caseId: string, label: string) {
  const response = await fetch(`${API_URL}/v1/learning/feedback`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-role": "analyst",
    },
    body: JSON.stringify({
      caseId,
      label,
      analyst: "console.user",
      notes: "Label submitted from African Guard operating console.",
    }),
  });
  if (!response.ok) throw new Error(`Feedback failed with ${response.status}`);
  return response.json() as Promise<unknown>;
}

export async function runAgent(prompt: string, agentId?: string, entityName?: string): Promise<AgentRunResult> {
  const response = await fetch(`${API_URL}/v1/agents/run`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-role": "fraud_investigator",
    },
    body: JSON.stringify({ prompt, agentId, entityName }),
  });
  if (!response.ok) throw new Error(`Agent run failed with ${response.status}`);
  return response.json() as Promise<AgentRunResult>;
}

export async function osintSearch(entityName: string): Promise<OsintFinding> {
  const response = await fetch(`${API_URL}/v1/agents/osint`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-role": "compliance_officer",
    },
    body: JSON.stringify({ entityName }),
  });
  if (!response.ok) throw new Error(`OSINT search failed with ${response.status}`);
  return response.json() as Promise<OsintFinding>;
}

export async function runAgentOpsCycle(): Promise<{ run: AgentRunResult; action: AgentAction; controlPlane: AgentOpsControlPlane }> {
  const response = await fetch(`${API_URL}/v1/agentops/run-cycle`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-role": "fraud_investigator",
      "x-actor": "console.user",
    },
  });
  if (!response.ok) throw new Error(`AgentOps cycle failed with ${response.status}`);
  return response.json() as Promise<{ run: AgentRunResult; action: AgentAction; controlPlane: AgentOpsControlPlane }>;
}

export async function approveAgentAction(id: string): Promise<{ action: AgentAction; controlPlane: AgentOpsControlPlane }> {
  const response = await fetch(`${API_URL}/v1/agentops/actions/${id}/approve`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-role": "fraud_investigator",
      "x-actor": "console.user",
    },
  });
  if (!response.ok) throw new Error(`Agent action approval failed with ${response.status}`);
  return response.json() as Promise<{ action: AgentAction; controlPlane: AgentOpsControlPlane }>;
}

export async function setAgentAutonomy(mode: AgentAutonomyMode): Promise<AgentOpsControlPlane> {
  const response = await fetch(`${API_URL}/v1/agentops/autonomy`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-role": "admin",
      "x-actor": "console.admin",
    },
    body: JSON.stringify({ mode }),
  });
  if (!response.ok) throw new Error(`Autonomy update failed with ${response.status}`);
  return response.json() as Promise<AgentOpsControlPlane>;
}

export async function fetchDeploymentReadiness(): Promise<DeploymentReadiness> {
  const response = await fetch(`${API_URL}/v1/deployment/readiness`, {
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Readiness check failed with ${response.status}`);
  return response.json() as Promise<DeploymentReadiness>;
}

export async function testIntegration(id: string): Promise<{ integration: IntegrationConnection; result: string; checks: string[] }> {
  const response = await fetch(`${API_URL}/v1/integrations/${id}/test`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-role": "developer",
      "x-actor": "console.developer",
    },
  });
  if (!response.ok) throw new Error(`Integration test failed with ${response.status}`);
  return response.json() as Promise<{ integration: IntegrationConnection; result: string; checks: string[] }>;
}

export async function ingestDemoTransaction(integrationId: string): Promise<{ record: TransactionMonitoringRecord; decision: RiskDecision }> {
  const response = await fetch(`${API_URL}/v1/transactions/ingest`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-role": "developer",
    },
    body: JSON.stringify({
      integrationId,
      amount: 42000,
      currency: "USD",
      customerId: `demo-customer-${Math.round(Math.random() * 9999)}`,
      merchantId: "mrc-velo-184",
      deviceId: "dev-shared-019",
      ipAddress: "198.51.100.24",
      beneficiaryId: "ben-mule-7731",
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
  if (!response.ok) throw new Error(`Transaction ingest failed with ${response.status}`);
  return response.json() as Promise<{ record: TransactionMonitoringRecord; decision: RiskDecision }>;
}

export async function runLawfulOsintSearch(): Promise<OsintInvestigationResult> {
  const response = await fetch(`${API_URL}/v1/osint/identity-search`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-role": "investigator",
      "x-actor": "console.investigator",
    },
    body: JSON.stringify({
      tenantId: "tenant-civic-benefits",
      caseId: "case-2051",
      investigatorId: "usr-access-investigator",
      lawfulBasis: "Public task and fraud prevention investigation",
      purpose: "Verify declared identity and possible undeclared business association for an open case.",
      permissionLevel: "enhanced",
      query: {
        name: "Amina K.",
        email: "email_hash_39da",
        employerOrBusiness: "Northstar Skins",
      },
    }),
  });
  if (!response.ok) throw new Error(`OSINT search failed with ${response.status}`);
  return response.json() as Promise<OsintInvestigationResult>;
}
