import { AuthMethod, IntegrationType, TransactionRail } from "../../domain";

export interface PaymentNetworkAdapterContract {
  id: string;
  type: IntegrationType;
  authMethods: AuthMethod[];
  rails: TransactionRail[];
  authenticate(): Promise<boolean>;
  pullTransactions(cursor?: string): Promise<unknown[]>;
  receiveWebhook(payload: unknown, signature?: string): Promise<boolean>;
  mapSchema(payload: unknown): Record<string, unknown>;
}

export const adapterArchitecture = [
  "authenticate",
  "pullTransactions",
  "receiveWebhook",
  "mapSchema",
  "retry",
  "rateLimit",
  "deadLetter",
];
