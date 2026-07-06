CREATE TABLE "Tenant" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "country" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "isolationKey" TEXT NOT NULL UNIQUE,
  "mfaRequired" BOOLEAN NOT NULL DEFAULT true,
  "retentionDays" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "IntegrationConnection" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "adapterId" TEXT NOT NULL,
  "environment" TEXT NOT NULL,
  "authMethods" JSONB NOT NULL,
  "status" TEXT NOT NULL,
  "scopes" JSONB NOT NULL,
  "encryptedCredentialRef" TEXT NOT NULL,
  "credentialFingerprint" TEXT NOT NULL,
  "fieldMappings" JSONB NOT NULL,
  "webhook" JSONB,
  "lastSyncAt" TIMESTAMP(3),
  "lastSuccessfulSyncAt" TIMESTAMP(3),
  "dataVolume24h" INTEGER NOT NULL DEFAULT 0,
  "totalTransactionsIngested" INTEGER NOT NULL DEFAULT 0,
  "rateLimitPerMinute" INTEGER NOT NULL,
  "retryPolicy" TEXT NOT NULL,
  "errors" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "DeveloperApiKey" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "prefix" TEXT NOT NULL,
  "fingerprint" TEXT NOT NULL UNIQUE,
  "scopes" JSONB NOT NULL,
  "status" TEXT NOT NULL,
  "lastUsedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "TransactionMonitor" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "sourceIntegrationId" TEXT NOT NULL,
  "rail" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "amount" DECIMAL(65,30) NOT NULL,
  "currency" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "accountId" TEXT,
  "cardId" TEXT,
  "merchantId" TEXT,
  "deviceId" TEXT,
  "ipAddress" TEXT,
  "beneficiaryId" TEXT,
  "riskScore" INTEGER NOT NULL,
  "riskLevel" "RiskLevel" NOT NULL,
  "decision" "Decision" NOT NULL,
  "reasons" JSONB NOT NULL,
  "explainability" JSONB NOT NULL,
  "caseId" TEXT,
  "ingestedAt" TIMESTAMP(3) NOT NULL,
  "processedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "EvidenceCapture" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "caseId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "sourceUrl" TEXT,
  "hash" TEXT NOT NULL,
  "capturedBy" TEXT NOT NULL,
  "chainOfCustody" JSONB NOT NULL,
  "quality" TEXT NOT NULL,
  "retentionExpiresAt" TIMESTAMP(3) NOT NULL,
  "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "OsintSearch" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "caseId" TEXT NOT NULL,
  "investigatorId" TEXT NOT NULL,
  "lawfulBasis" TEXT NOT NULL,
  "purpose" TEXT NOT NULL,
  "permissionLevel" TEXT NOT NULL,
  "query" JSONB NOT NULL,
  "sourcesQueried" JSONB NOT NULL,
  "matches" JSONB NOT NULL,
  "safeguards" JSONB NOT NULL,
  "searchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
