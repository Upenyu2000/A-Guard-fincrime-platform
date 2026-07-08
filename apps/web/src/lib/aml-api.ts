import { fallbackAmlWorkspace } from "./aml-fallback";
import { AmlTransactionDetail, AmlWorkspaceSnapshot } from "./aml-types";
import { API_URL } from "./api";

const headers = (role = "compliance_officer") => ({
  "content-type": "application/json",
  "x-role": role,
  "x-actor": "aml.console.user",
});

async function json<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}/v1${path}`, {
    cache: "no-store",
    ...init,
    headers: {
      ...headers(),
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) throw new Error(`AML API returned ${response.status}`);
  return (await response.json()) as T;
}

export async function fetchAmlWorkspace(): Promise<AmlWorkspaceSnapshot> {
  try {
    return await json<AmlWorkspaceSnapshot>("/aml/workspace");
  } catch {
    return fallbackAmlWorkspace;
  }
}

export async function fetchAmlTransaction(id: string): Promise<AmlTransactionDetail> {
  return json<AmlTransactionDetail>(`/aml/transactions/${id}`);
}

export async function evaluateDemoAmlTransaction() {
  return json("/aml/transactions/evaluate", {
    method: "POST",
    body: JSON.stringify({
      eventId: `evt-manual-${Math.round(Math.random() * 9000)}`,
      institution: "African Trust Bank",
      customerId: "cust-wallet-042",
      accountId: "acct-wallet-042",
      walletId: "wallet-042",
      sender: "wallet-042",
      receiver: "beneficiary-new-console",
      beneficiary: "New console beneficiary",
      merchant: "Moyo Cash",
      amount: 987,
      currency: "USD",
      baseCurrencyEquivalent: 987,
      originCountry: "NG",
      destinationCountry: "NG",
      channel: "mobile_money",
      paymentMethod: "wallet_to_wallet",
      deviceId: "dev-shared-991",
      ipAddress: "198.51.100.42",
      phoneHash: "phone-hash-4202",
      addressHash: "addr-hash-yaba",
      description: "Console-triggered low-value payment below internal review threshold",
      direction: "outgoing",
    }),
  });
}

export async function assignAmlAlert(id: string, analyst = "amara.okafor") {
  return json(`/aml/alerts/${id}/assign`, {
    method: "POST",
    body: JSON.stringify({ analyst, reason: "Assigned from AML workspace." }),
  });
}

export async function escalateAmlAlert(id: string) {
  return json(`/aml/alerts/${id}/escalate`, {
    method: "POST",
    body: JSON.stringify({ reason: "Escalated from AML workspace for compliance review." }),
  });
}

export async function convertAmlAlertToCase(id: string) {
  return json(`/aml/alerts/${id}/convert-to-case`, {
    method: "POST",
    body: JSON.stringify({ reason: "Converted to investigation from AML workspace." }),
  });
}

export async function closeAmlAlertFalsePositive(id: string) {
  return json(`/aml/alerts/${id}/close`, {
    method: "POST",
    body: JSON.stringify({ status: "closed_false_positive", reason: "Seeded test disposition from AML workspace." }),
  });
}

export async function refreshKyc(id: string) {
  return json(`/aml/customers/${id}/refresh`, { method: "POST" });
}

export async function refreshKyb(id: string) {
  return json(`/aml/businesses/${id}/refresh`, { method: "POST" });
}

export async function runScreening(subjectId: string, subjectType: "customer" | "business", checkType = "sanctions") {
  return json("/aml/screening", {
    method: "POST",
    body: JSON.stringify({ subjectId, subjectType, checkType, provider: "manual-screening-adapter" }),
  });
}

export async function backtestRule(id: string) {
  return json(`/aml/rules/${id}/backtest`, { method: "POST" });
}

export async function createAmlRule() {
  return json("/aml/rules", {
    method: "POST",
    headers: headers("rule_administrator"),
    body: JSON.stringify({
      name: `Console draft rule ${Math.round(Math.random() * 9000)}`,
      description: "Draft configurable rule created from the AML workspace for four-eyes review.",
      category: "threshold_avoidance",
      field: "baseCurrencyEquivalent",
      operator: "percentage_below_threshold",
      comparisonValue: "internal_review_threshold",
      rollingWindow: "24h",
      countThreshold: 4,
      cumulativeThreshold: 5000,
      scoreContribution: 18,
      action: "review",
      reason: "Rule administrator created a draft scenario from the AML workspace.",
    }),
  });
}

export async function approveRule(id: string) {
  return json(`/aml/rules/${id}/approve`, { method: "POST", headers: headers("compliance_officer") });
}

export async function activateRule(id: string) {
  return json(`/aml/rules/${id}/activate`, { method: "POST", headers: headers("compliance_officer") });
}

export async function createSarDraft(caseId: string) {
  return json("/aml/sar-drafts", {
    method: "POST",
    body: JSON.stringify({ caseId, reason: "Prepared from AML workspace. AI narrative requires human validation." }),
  });
}

export async function approveSarDraft(id: string) {
  return json(`/aml/sar-drafts/${id}/approve`, {
    method: "POST",
    headers: headers("mlro"),
    body: JSON.stringify({ reason: "Approved by MLRO-equivalent local-development role." }),
  });
}
