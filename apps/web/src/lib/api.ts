import { fallbackPicture } from "./fallback";
import { AgentRunResult, OperatingPicture, OsintFinding, RiskDecision } from "./types";

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
        ip_risk: 77,
        geo_velocity_kmh: 1200,
        account_age_days: 8,
        email_risk: 71,
        phone_risk: 64,
        behavior_deviation: 88,
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
