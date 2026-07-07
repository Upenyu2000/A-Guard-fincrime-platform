import { API_URL, ApiError, getAccessToken } from "./api";

export interface PaginatedResponse<T> {
  items: T[];
  nextCursor?: string;
}

export interface LiveIntegration {
  id: string;
  name: string;
  type: string;
  provider: string;
  adapterId: string;
  environment: string;
  status: string;
  scopes: unknown;
  lastSyncAt?: string | null;
  lastSuccessfulSyncAt?: string | null;
  totalTransactionsIngested: string;
  createdAt: string;
  updatedAt: string;
}

export interface LiveTransaction {
  id: string;
  externalTransactionId: string;
  rail: string;
  eventType: string;
  amount: string;
  currency: string;
  status: string;
  customerId: string;
  merchantId?: string | null;
  riskScore?: number | null;
  riskLevel?: string | null;
  decision?: string | null;
  reasons?: unknown;
  modelVersion?: string | null;
  policyVersion?: string | null;
  eventAt: string;
  ingestedAt: string;
  processedAt?: string | null;
}

export interface LiveCase {
  id: string;
  title: string;
  status: string;
  priority: string;
  assigneeSubject?: string | null;
  lossExposure: string;
  recoveryPotential: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    transactions: number;
    evidenceCaptures: number;
  };
}

export interface LiveReadiness {
  status: "ready" | "unavailable";
  dependencies?: Record<
    string,
    {
      status: "ready" | "unavailable" | "not_configured";
      required: boolean;
      latencyMs?: number;
      detail?: string;
    }
  >;
  timestamp?: string;
}

export interface LiveTransactionInput {
  externalTransactionId: string;
  integrationId: string;
  schemaVersion: string;
  rail:
    | "open_banking"
    | "ach"
    | "wire"
    | "rtp"
    | "sepa"
    | "visa"
    | "mastercard"
    | "debit_card"
    | "credit_card"
    | "psp"
    | "internal";
  eventType: string;
  amount: string;
  currency: string;
  originalAmount?: string;
  originalCurrency?: string;
  customerId: string;
  accountId?: string;
  cardId?: string;
  merchantId?: string;
  deviceId?: string;
  ipAddress?: string;
  beneficiaryId?: string;
  eventAt: string;
  signals?: Record<string, number | boolean>;
}

export interface LiveIngestionResult {
  id: string;
  externalTransactionId: string;
  processingStatus: string;
  riskScore: number;
  riskLevel: string;
  decision: string;
  modelVersion: string;
  policyVersion: string;
  degraded: boolean;
}

async function liveFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getAccessToken();
  if (!token) throw new ApiError("Authentication token is missing.", 401);

  const headers = new Headers(init.headers);
  headers.set("authorization", `Bearer ${token}`);
  if (init.body && !headers.has("content-type")) headers.set("content-type", "application/json");

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
    cache: init.cache ?? "no-store",
  });
  const contentType = response.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json")
    ? await response.json().catch(() => undefined)
    : await response.text().catch(() => undefined);

  if (!response.ok) {
    const message =
      body && typeof body === "object" && "message" in body
        ? String((body as { message?: unknown }).message)
        : `Live API returned ${response.status}.`;
    throw new ApiError(message, response.status, body);
  }
  return body as T;
}

export async function fetchLiveReadiness(): Promise<LiveReadiness> {
  const response = await fetch(`${API_URL}/v1/live/health/ready`, { cache: "no-store" });
  const body = (await response.json().catch(() => ({ status: "unavailable" }))) as LiveReadiness;
  return response.ok ? body : { ...body, status: "unavailable" };
}

export function fetchLiveIntegrations(): Promise<PaginatedResponse<LiveIntegration>> {
  return liveFetch<PaginatedResponse<LiveIntegration>>("/v1/live/integrations?limit=100");
}

export function fetchLiveTransactions(): Promise<PaginatedResponse<LiveTransaction>> {
  return liveFetch<PaginatedResponse<LiveTransaction>>("/v1/live/transactions?limit=100");
}

export function fetchLiveCases(): Promise<PaginatedResponse<LiveCase>> {
  return liveFetch<PaginatedResponse<LiveCase>>("/v1/live/cases?limit=100");
}

export function ingestLiveTransaction(
  input: LiveTransactionInput,
  idempotencyKey: string,
): Promise<LiveIngestionResult> {
  return liveFetch<LiveIngestionResult>("/v1/live/transactions", {
    method: "POST",
    headers: { "idempotency-key": idempotencyKey },
    body: JSON.stringify(input),
  });
}
