import { UserRole } from "../../domain";

export interface AuthenticatedPrincipal {
  subject: string;
  tenantId: string;
  roles: UserRole[];
  scopes: string[];
  issuer: string;
  audience: string[];
  tokenId?: string;
  authenticationMethods: string[];
}

export interface AuthenticatedRequest {
  headers: Record<string, string | string[] | undefined>;
  user?: AuthenticatedPrincipal;
  rawBody?: Buffer;
}

export const supportedRoles: ReadonlySet<UserRole> = new Set<UserRole>([
  "analyst",
  "investigator",
  "fraud_investigator",
  "compliance_officer",
  "reviewer",
  "auditor",
  "developer",
  "admin",
  "institution_partner",
]);
