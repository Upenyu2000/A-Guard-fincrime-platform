-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('TRANSACTION', 'LOGIN', 'DEVICE_CHANGE', 'ACCOUNT_UPDATE', 'BENEFICIARY_CREATION');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "Decision" AS ENUM ('APPROVE', 'REVIEW', 'BLOCK');

-- CreateEnum
CREATE TYPE "CaseStatus" AS ENUM ('NEW', 'INVESTIGATING', 'ESCALATED', 'RECOVERED', 'CLOSED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('INITIATED', 'IN_FLIGHT', 'HELD', 'FLAGGED', 'RECALLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('NOT_STARTED', 'INFORMATION_REQUESTED', 'VERIFICATION_IN_PROGRESS', 'PASSED', 'REFERRED', 'EDD_REQUIRED', 'REJECTED', 'EXPIRED', 'REVIEW_OVERDUE');

-- CreateEnum
CREATE TYPE "ScreeningResultStatus" AS ENUM ('LIVE_PROVIDER_RESULT', 'MOCK_RESULT', 'TEST_RESULT', 'MANUAL_VERIFICATION_REQUIRED', 'PROVIDER_UNAVAILABLE', 'SCREENING_NOT_COMPLETED');

-- CreateEnum
CREATE TYPE "ScreeningDisposition" AS ENUM ('CLEAR', 'POSSIBLE_MATCH', 'TRUE_MATCH', 'FALSE_POSITIVE', 'NEEDS_REVIEW');

-- CreateEnum
CREATE TYPE "AmlDecision" AS ENUM ('APPROVE', 'APPROVE_MONITOR', 'STEP_UP', 'REVIEW', 'HOLD', 'BLOCK', 'ESCALATE');

-- CreateEnum
CREATE TYPE "AmlRuleProductionStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'ACTIVE', 'INACTIVE', 'RETIRED');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AmlAlertStatus" AS ENUM ('NEW', 'UNASSIGNED', 'ASSIGNED', 'IN_REVIEW', 'INFORMATION_REQUESTED', 'ESCALATED', 'CONVERTED_TO_CASE', 'CLOSED_FALSE_POSITIVE', 'CLOSED_EXPLAINED_ACTIVITY', 'CLOSED_WITH_MONITORING', 'CONFIRMED_SUSPICIOUS', 'REFERRED_TO_MLRO');

-- CreateEnum
CREATE TYPE "SarStatus" AS ENUM ('DRAFT', 'READY_FOR_REVIEW', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "Institution" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "trustScore" INTEGER NOT NULL,
    "reputation" INTEGER NOT NULL,
    "encryptedKeyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Institution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FraudEvent" (
    "id" TEXT NOT NULL,
    "type" "EventType" NOT NULL,
    "subjectHash" TEXT NOT NULL,
    "amount" DECIMAL(65,30),
    "currency" TEXT,
    "riskScore" INTEGER NOT NULL,
    "riskLevel" "RiskLevel" NOT NULL,
    "decision" "Decision" NOT NULL,
    "reasons" JSONB NOT NULL,
    "componentScores" JSONB NOT NULL,
    "latencyMs" INTEGER NOT NULL,
    "institutionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FraudEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "institutionId" TEXT,
    "title" TEXT NOT NULL,
    "severity" "RiskLevel" NOT NULL,
    "route" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Case" (
    "id" TEXT NOT NULL,
    "alertId" TEXT,
    "title" TEXT NOT NULL,
    "assignee" TEXT NOT NULL,
    "status" "CaseStatus" NOT NULL DEFAULT 'NEW',
    "priority" "RiskLevel" NOT NULL,
    "timeline" JSONB NOT NULL,
    "evidence" JSONB NOT NULL,
    "sarDraft" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Case_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "status" "PaymentStatus" NOT NULL,
    "recallAvailable" BOOLEAN NOT NULL DEFAULT false,
    "route" JSONB NOT NULL,
    "riskSignals" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GraphEntity" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "risk" INTEGER NOT NULL,
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GraphEntity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GraphEdge" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GraphEdge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningFeedback" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "analyst" TEXT NOT NULL,
    "notes" TEXT NOT NULL,
    "featureHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LearningFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "fullLegalName" TEXT NOT NULL,
    "previousNames" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "dateOfBirth" TIMESTAMP(3),
    "nationality" TEXT NOT NULL,
    "countryOfResidence" TEXT NOT NULL,
    "telephoneNumber" TEXT,
    "emailAddress" TEXT,
    "occupation" TEXT,
    "employer" TEXT,
    "expectedAccountPurpose" TEXT,
    "expectedMonthlyIncome" DECIMAL(65,30),
    "expectedTransactionVolume" DECIMAL(65,30),
    "expectedPaymentCorridors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "expectedCounterparties" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sourceOfFunds" TEXT,
    "sourceOfWealth" TEXT,
    "taxResidency" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "riskScore" INTEGER NOT NULL DEFAULT 0,
    "kycStatus" "VerificationStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "lastReviewDate" TIMESTAMP(3),
    "nextReviewDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_identities" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "issuingCountry" TEXT NOT NULL,
    "maskedDocumentNumber" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "livenessStatus" "VerificationStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_addresses" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "addressLine" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "businesses" (
    "id" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "tradingName" TEXT,
    "companyNumber" TEXT NOT NULL,
    "incorporationDate" TIMESTAMP(3),
    "incorporationCountry" TEXT NOT NULL,
    "registeredAddress" TEXT NOT NULL,
    "tradingAddress" TEXT,
    "businessType" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "website" TEXT,
    "emailDomain" TEXT,
    "declaredTurnover" DECIMAL(65,30),
    "expectedTransactionVolume" DECIMAL(65,30),
    "countriesOfOperation" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "regulatoryStatus" TEXT,
    "sourceOfBusinessFunds" TEXT,
    "businessRelationshipPurpose" TEXT,
    "licences" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "taxInformation" TEXT,
    "kybStatus" "VerificationStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "riskScore" INTEGER NOT NULL DEFAULT 0,
    "lastReviewDate" TIMESTAMP(3),
    "nextReviewDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "businesses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_directors" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "riskLevel" "RiskLevel" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "business_directors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_shareholders" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ownershipPct" DECIMAL(65,30) NOT NULL,
    "riskLevel" "RiskLevel" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "business_shareholders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "beneficial_owners" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ownershipPct" DECIMAL(65,30) NOT NULL,
    "riskLevel" "RiskLevel" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "beneficial_owners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ownership_relationships" (
    "id" TEXT NOT NULL,
    "parentBusinessId" TEXT NOT NULL,
    "childBusinessId" TEXT NOT NULL,
    "relationshipType" TEXT NOT NULL,
    "ownershipPct" DECIMAL(65,30),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ownership_relationships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "customerId" TEXT,
    "businessId" TEXT,
    "accountType" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallets" (
    "id" TEXT NOT NULL,
    "customerId" TEXT,
    "businessId" TEXT,
    "accountId" TEXT,
    "provider" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "counterparties" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT,
    "type" TEXT NOT NULL,

    CONSTRAINT "counterparties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "beneficiaries" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "accountRef" TEXT,
    "country" TEXT,
    "riskScore" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "beneficiaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "devices" (
    "id" TEXT NOT NULL,
    "deviceHash" TEXT NOT NULL,
    "riskScore" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ip_addresses" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "country" TEXT,
    "riskScore" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ip_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aml_transactions" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "institution" TEXT NOT NULL,
    "customerId" TEXT,
    "businessId" TEXT,
    "accountId" TEXT,
    "walletId" TEXT,
    "counterpartyId" TEXT,
    "beneficiaryId" TEXT,
    "deviceId" TEXT,
    "ipAddressId" TEXT,
    "sender" TEXT NOT NULL,
    "receiver" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL,
    "baseCurrencyEquivalent" DECIMAL(65,30) NOT NULL,
    "originCountry" TEXT NOT NULL,
    "destinationCountry" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL,
    "fraudRisk" INTEGER NOT NULL DEFAULT 0,
    "amlRisk" INTEGER NOT NULL DEFAULT 0,
    "unifiedRisk" INTEGER NOT NULL DEFAULT 0,
    "decision" "AmlDecision" NOT NULL,
    "rulesTriggered" JSONB NOT NULL,
    "alertStatus" "AmlAlertStatus",
    "componentScores" JSONB NOT NULL,
    "explainability" JSONB NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "aml_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kyc_assessments" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "status" "VerificationStatus" NOT NULL,
    "riskScore" INTEGER NOT NULL,
    "checks" JSONB NOT NULL,
    "decisionReason" TEXT NOT NULL,
    "reviewer" TEXT,
    "nextReviewDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kyc_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kyb_assessments" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "status" "VerificationStatus" NOT NULL,
    "riskScore" INTEGER NOT NULL,
    "checks" JSONB NOT NULL,
    "decisionReason" TEXT NOT NULL,
    "reviewer" TEXT,
    "nextReviewDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kyb_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "screening_checks" (
    "id" TEXT NOT NULL,
    "customerId" TEXT,
    "businessId" TEXT,
    "beneficialOwnerId" TEXT,
    "subjectId" TEXT NOT NULL,
    "subjectType" TEXT NOT NULL,
    "checkType" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "datasetVersion" TEXT NOT NULL,
    "resultStatus" "ScreeningResultStatus" NOT NULL,
    "matchScore" INTEGER NOT NULL,
    "matchingFields" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "disposition" "ScreeningDisposition" NOT NULL,
    "reviewer" TEXT,
    "evidence" JSONB NOT NULL,
    "nextReviewDate" TIMESTAMP(3),
    "checkedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "screening_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "screening_matches" (
    "id" TEXT NOT NULL,
    "screeningCheckId" TEXT NOT NULL,
    "matchedName" TEXT NOT NULL,
    "matchScore" INTEGER NOT NULL,
    "matchingFields" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "evidence" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "screening_matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aml_rules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "jurisdiction" TEXT NOT NULL,
    "institution" TEXT NOT NULL,
    "customerSegment" TEXT NOT NULL,
    "businessSegment" TEXT NOT NULL,
    "transactionChannel" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "operator" TEXT NOT NULL,
    "comparisonValue" TEXT NOT NULL,
    "aggregation" TEXT NOT NULL,
    "rollingWindow" TEXT NOT NULL,
    "countThreshold" INTEGER NOT NULL,
    "cumulativeThreshold" DECIMAL(65,30) NOT NULL,
    "scoreContribution" INTEGER NOT NULL,
    "priority" "RiskLevel" NOT NULL,
    "action" "AmlDecision" NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "expiryDate" TIMESTAMP(3),
    "owner" TEXT NOT NULL,
    "currentVersion" INTEGER NOT NULL DEFAULT 1,
    "approvalStatus" "ApprovalStatus" NOT NULL,
    "productionStatus" "AmlRuleProductionStatus" NOT NULL,
    "logic" JSONB NOT NULL,
    "estimatedAlertVolume" INTEGER NOT NULL DEFAULT 0,
    "estimatedFalsePositiveRate" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "aml_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aml_rule_versions" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "definition" JSONB NOT NULL,
    "changedBy" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "aml_rule_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rule_test_results" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "matchedTransactionCount" INTEGER NOT NULL,
    "estimatedAlertVolume" INTEGER NOT NULL,
    "estimatedFalsePositiveRate" DECIMAL(65,30) NOT NULL,
    "sampleEvidence" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rule_test_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aml_alerts" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "customerId" TEXT,
    "businessId" TEXT,
    "subjectId" TEXT NOT NULL,
    "subjectType" TEXT NOT NULL,
    "rulesTriggered" JSONB NOT NULL,
    "riskScores" JSONB NOT NULL,
    "cumulativeAmount" DECIMAL(65,30) NOT NULL,
    "transactionCount" INTEGER NOT NULL,
    "rollingWindow" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "evidence" JSONB NOT NULL,
    "suggestedAction" TEXT NOT NULL,
    "assignedAnalyst" TEXT,
    "status" "AmlAlertStatus" NOT NULL,
    "serviceLevelDeadline" TIMESTAMP(3) NOT NULL,
    "relatedAlerts" JSONB NOT NULL,
    "relatedCases" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "aml_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aml_alert_transactions" (
    "id" TEXT NOT NULL,
    "alertId" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,

    CONSTRAINT "aml_alert_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "investigation_evidence" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "confidence" INTEGER NOT NULL,
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "investigation_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "investigation_notes" (
    "id" TEXT NOT NULL,
    "alertId" TEXT,
    "caseId" TEXT,
    "actor" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "investigation_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sar_drafts" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "subjectIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "businessIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "accountIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "walletIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "transactionChronology" JSONB NOT NULL,
    "totalSuspiciousValue" DECIMAL(65,30) NOT NULL,
    "suspicionIndicators" JSONB NOT NULL,
    "reasonForSuspicion" TEXT NOT NULL,
    "paymentCorridors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sourceOfFundsConcerns" JSONB NOT NULL,
    "relatedEntities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "supportingEvidence" JSONB NOT NULL,
    "internalReferences" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "glossaryCategories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "investigator" TEXT NOT NULL,
    "mlroReviewStatus" "SarStatus" NOT NULL,
    "narrative" TEXT NOT NULL,
    "aiGenerated" BOOLEAN NOT NULL DEFAULT true,
    "tippingOffControls" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "approvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sar_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approvals" (
    "id" TEXT NOT NULL,
    "approver" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "status" "ApprovalStatus" NOT NULL,
    "reason" TEXT NOT NULL,
    "ruleId" TEXT,
    "alertId" TEXT,
    "sarDraftId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manual_overrides" (
    "id" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "previousValue" JSONB NOT NULL,
    "newValue" JSONB NOT NULL,
    "reason" TEXT NOT NULL,
    "customerId" TEXT,
    "businessId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "manual_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Alert_eventId_key" ON "Alert"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "Case_alertId_key" ON "Case"("alertId");

-- CreateIndex
CREATE INDEX "customers_countryOfResidence_idx" ON "customers"("countryOfResidence");

-- CreateIndex
CREATE INDEX "customers_riskScore_idx" ON "customers"("riskScore");

-- CreateIndex
CREATE INDEX "customers_kycStatus_idx" ON "customers"("kycStatus");

-- CreateIndex
CREATE INDEX "customer_identities_customerId_idx" ON "customer_identities"("customerId");

-- CreateIndex
CREATE INDEX "customer_identities_expiresAt_idx" ON "customer_identities"("expiresAt");

-- CreateIndex
CREATE INDEX "customer_addresses_customerId_idx" ON "customer_addresses"("customerId");

-- CreateIndex
CREATE INDEX "customer_addresses_country_idx" ON "customer_addresses"("country");

-- CreateIndex
CREATE INDEX "businesses_companyNumber_idx" ON "businesses"("companyNumber");

-- CreateIndex
CREATE INDEX "businesses_incorporationCountry_idx" ON "businesses"("incorporationCountry");

-- CreateIndex
CREATE INDEX "businesses_riskScore_idx" ON "businesses"("riskScore");

-- CreateIndex
CREATE INDEX "businesses_kybStatus_idx" ON "businesses"("kybStatus");

-- CreateIndex
CREATE INDEX "business_directors_businessId_idx" ON "business_directors"("businessId");

-- CreateIndex
CREATE INDEX "business_directors_country_idx" ON "business_directors"("country");

-- CreateIndex
CREATE INDEX "business_shareholders_businessId_idx" ON "business_shareholders"("businessId");

-- CreateIndex
CREATE INDEX "beneficial_owners_businessId_idx" ON "beneficial_owners"("businessId");

-- CreateIndex
CREATE INDEX "beneficial_owners_riskLevel_idx" ON "beneficial_owners"("riskLevel");

-- CreateIndex
CREATE INDEX "ownership_relationships_parentBusinessId_idx" ON "ownership_relationships"("parentBusinessId");

-- CreateIndex
CREATE INDEX "ownership_relationships_childBusinessId_idx" ON "ownership_relationships"("childBusinessId");

-- CreateIndex
CREATE INDEX "accounts_customerId_idx" ON "accounts"("customerId");

-- CreateIndex
CREATE INDEX "accounts_businessId_idx" ON "accounts"("businessId");

-- CreateIndex
CREATE INDEX "accounts_currency_idx" ON "accounts"("currency");

-- CreateIndex
CREATE INDEX "accounts_status_idx" ON "accounts"("status");

-- CreateIndex
CREATE INDEX "wallets_customerId_idx" ON "wallets"("customerId");

-- CreateIndex
CREATE INDEX "wallets_businessId_idx" ON "wallets"("businessId");

-- CreateIndex
CREATE INDEX "wallets_accountId_idx" ON "wallets"("accountId");

-- CreateIndex
CREATE INDEX "wallets_status_idx" ON "wallets"("status");

-- CreateIndex
CREATE INDEX "counterparties_country_idx" ON "counterparties"("country");

-- CreateIndex
CREATE INDEX "beneficiaries_country_idx" ON "beneficiaries"("country");

-- CreateIndex
CREATE INDEX "beneficiaries_riskScore_idx" ON "beneficiaries"("riskScore");

-- CreateIndex
CREATE UNIQUE INDEX "devices_deviceHash_key" ON "devices"("deviceHash");

-- CreateIndex
CREATE INDEX "devices_riskScore_idx" ON "devices"("riskScore");

-- CreateIndex
CREATE UNIQUE INDEX "ip_addresses_address_key" ON "ip_addresses"("address");

-- CreateIndex
CREATE INDEX "ip_addresses_country_idx" ON "ip_addresses"("country");

-- CreateIndex
CREATE INDEX "ip_addresses_riskScore_idx" ON "ip_addresses"("riskScore");

-- CreateIndex
CREATE UNIQUE INDEX "aml_transactions_eventId_key" ON "aml_transactions"("eventId");

-- CreateIndex
CREATE INDEX "aml_transactions_occurredAt_idx" ON "aml_transactions"("occurredAt");

-- CreateIndex
CREATE INDEX "aml_transactions_customerId_idx" ON "aml_transactions"("customerId");

-- CreateIndex
CREATE INDEX "aml_transactions_businessId_idx" ON "aml_transactions"("businessId");

-- CreateIndex
CREATE INDEX "aml_transactions_accountId_idx" ON "aml_transactions"("accountId");

-- CreateIndex
CREATE INDEX "aml_transactions_walletId_idx" ON "aml_transactions"("walletId");

-- CreateIndex
CREATE INDEX "aml_transactions_sender_idx" ON "aml_transactions"("sender");

-- CreateIndex
CREATE INDEX "aml_transactions_receiver_idx" ON "aml_transactions"("receiver");

-- CreateIndex
CREATE INDEX "aml_transactions_beneficiaryId_idx" ON "aml_transactions"("beneficiaryId");

-- CreateIndex
CREATE INDEX "aml_transactions_deviceId_idx" ON "aml_transactions"("deviceId");

-- CreateIndex
CREATE INDEX "aml_transactions_ipAddressId_idx" ON "aml_transactions"("ipAddressId");

-- CreateIndex
CREATE INDEX "aml_transactions_originCountry_idx" ON "aml_transactions"("originCountry");

-- CreateIndex
CREATE INDEX "aml_transactions_destinationCountry_idx" ON "aml_transactions"("destinationCountry");

-- CreateIndex
CREATE INDEX "aml_transactions_currency_idx" ON "aml_transactions"("currency");

-- CreateIndex
CREATE INDEX "aml_transactions_amount_idx" ON "aml_transactions"("amount");

-- CreateIndex
CREATE INDEX "aml_transactions_unifiedRisk_idx" ON "aml_transactions"("unifiedRisk");

-- CreateIndex
CREATE INDEX "aml_transactions_alertStatus_idx" ON "aml_transactions"("alertStatus");

-- CreateIndex
CREATE INDEX "aml_transactions_status_idx" ON "aml_transactions"("status");

-- CreateIndex
CREATE INDEX "kyc_assessments_customerId_idx" ON "kyc_assessments"("customerId");

-- CreateIndex
CREATE INDEX "kyc_assessments_status_idx" ON "kyc_assessments"("status");

-- CreateIndex
CREATE INDEX "kyc_assessments_riskScore_idx" ON "kyc_assessments"("riskScore");

-- CreateIndex
CREATE INDEX "kyb_assessments_businessId_idx" ON "kyb_assessments"("businessId");

-- CreateIndex
CREATE INDEX "kyb_assessments_status_idx" ON "kyb_assessments"("status");

-- CreateIndex
CREATE INDEX "kyb_assessments_riskScore_idx" ON "kyb_assessments"("riskScore");

-- CreateIndex
CREATE INDEX "screening_checks_customerId_idx" ON "screening_checks"("customerId");

-- CreateIndex
CREATE INDEX "screening_checks_businessId_idx" ON "screening_checks"("businessId");

-- CreateIndex
CREATE INDEX "screening_checks_beneficialOwnerId_idx" ON "screening_checks"("beneficialOwnerId");

-- CreateIndex
CREATE INDEX "screening_checks_subjectId_idx" ON "screening_checks"("subjectId");

-- CreateIndex
CREATE INDEX "screening_checks_checkType_idx" ON "screening_checks"("checkType");

-- CreateIndex
CREATE INDEX "screening_checks_disposition_idx" ON "screening_checks"("disposition");

-- CreateIndex
CREATE INDEX "screening_checks_checkedAt_idx" ON "screening_checks"("checkedAt");

-- CreateIndex
CREATE INDEX "screening_matches_screeningCheckId_idx" ON "screening_matches"("screeningCheckId");

-- CreateIndex
CREATE INDEX "aml_rules_category_idx" ON "aml_rules"("category");

-- CreateIndex
CREATE INDEX "aml_rules_jurisdiction_idx" ON "aml_rules"("jurisdiction");

-- CreateIndex
CREATE INDEX "aml_rules_institution_idx" ON "aml_rules"("institution");

-- CreateIndex
CREATE INDEX "aml_rules_productionStatus_idx" ON "aml_rules"("productionStatus");

-- CreateIndex
CREATE INDEX "aml_rules_approvalStatus_idx" ON "aml_rules"("approvalStatus");

-- CreateIndex
CREATE INDEX "aml_rule_versions_ruleId_idx" ON "aml_rule_versions"("ruleId");

-- CreateIndex
CREATE INDEX "aml_rule_versions_version_idx" ON "aml_rule_versions"("version");

-- CreateIndex
CREATE INDEX "rule_test_results_ruleId_idx" ON "rule_test_results"("ruleId");

-- CreateIndex
CREATE INDEX "aml_alerts_customerId_idx" ON "aml_alerts"("customerId");

-- CreateIndex
CREATE INDEX "aml_alerts_businessId_idx" ON "aml_alerts"("businessId");

-- CreateIndex
CREATE INDEX "aml_alerts_subjectId_idx" ON "aml_alerts"("subjectId");

-- CreateIndex
CREATE INDEX "aml_alerts_category_idx" ON "aml_alerts"("category");

-- CreateIndex
CREATE INDEX "aml_alerts_status_idx" ON "aml_alerts"("status");

-- CreateIndex
CREATE INDEX "aml_alerts_createdAt_idx" ON "aml_alerts"("createdAt");

-- CreateIndex
CREATE INDEX "aml_alert_transactions_transactionId_idx" ON "aml_alert_transactions"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "aml_alert_transactions_alertId_transactionId_key" ON "aml_alert_transactions"("alertId", "transactionId");

-- CreateIndex
CREATE INDEX "investigation_evidence_caseId_idx" ON "investigation_evidence"("caseId");

-- CreateIndex
CREATE INDEX "investigation_notes_alertId_idx" ON "investigation_notes"("alertId");

-- CreateIndex
CREATE INDEX "investigation_notes_caseId_idx" ON "investigation_notes"("caseId");

-- CreateIndex
CREATE INDEX "sar_drafts_caseId_idx" ON "sar_drafts"("caseId");

-- CreateIndex
CREATE INDEX "sar_drafts_mlroReviewStatus_idx" ON "sar_drafts"("mlroReviewStatus");

-- CreateIndex
CREATE INDEX "approvals_ruleId_idx" ON "approvals"("ruleId");

-- CreateIndex
CREATE INDEX "approvals_alertId_idx" ON "approvals"("alertId");

-- CreateIndex
CREATE INDEX "approvals_sarDraftId_idx" ON "approvals"("sarDraftId");

-- CreateIndex
CREATE INDEX "manual_overrides_target_idx" ON "manual_overrides"("target");

-- CreateIndex
CREATE INDEX "manual_overrides_customerId_idx" ON "manual_overrides"("customerId");

-- CreateIndex
CREATE INDEX "manual_overrides_businessId_idx" ON "manual_overrides"("businessId");

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "FraudEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "Alert"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_identities" ADD CONSTRAINT "customer_identities_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_addresses" ADD CONSTRAINT "customer_addresses_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_directors" ADD CONSTRAINT "business_directors_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_shareholders" ADD CONSTRAINT "business_shareholders_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beneficial_owners" ADD CONSTRAINT "beneficial_owners_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ownership_relationships" ADD CONSTRAINT "ownership_relationships_parentBusinessId_fkey" FOREIGN KEY ("parentBusinessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ownership_relationships" ADD CONSTRAINT "ownership_relationships_childBusinessId_fkey" FOREIGN KEY ("childBusinessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aml_transactions" ADD CONSTRAINT "aml_transactions_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aml_transactions" ADD CONSTRAINT "aml_transactions_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aml_transactions" ADD CONSTRAINT "aml_transactions_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aml_transactions" ADD CONSTRAINT "aml_transactions_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aml_transactions" ADD CONSTRAINT "aml_transactions_counterpartyId_fkey" FOREIGN KEY ("counterpartyId") REFERENCES "counterparties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aml_transactions" ADD CONSTRAINT "aml_transactions_beneficiaryId_fkey" FOREIGN KEY ("beneficiaryId") REFERENCES "beneficiaries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aml_transactions" ADD CONSTRAINT "aml_transactions_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aml_transactions" ADD CONSTRAINT "aml_transactions_ipAddressId_fkey" FOREIGN KEY ("ipAddressId") REFERENCES "ip_addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kyc_assessments" ADD CONSTRAINT "kyc_assessments_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kyb_assessments" ADD CONSTRAINT "kyb_assessments_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "screening_checks" ADD CONSTRAINT "screening_checks_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "screening_checks" ADD CONSTRAINT "screening_checks_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "screening_checks" ADD CONSTRAINT "screening_checks_beneficialOwnerId_fkey" FOREIGN KEY ("beneficialOwnerId") REFERENCES "beneficial_owners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "screening_matches" ADD CONSTRAINT "screening_matches_screeningCheckId_fkey" FOREIGN KEY ("screeningCheckId") REFERENCES "screening_checks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aml_rule_versions" ADD CONSTRAINT "aml_rule_versions_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "aml_rules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rule_test_results" ADD CONSTRAINT "rule_test_results_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "aml_rules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aml_alerts" ADD CONSTRAINT "aml_alerts_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aml_alerts" ADD CONSTRAINT "aml_alerts_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aml_alert_transactions" ADD CONSTRAINT "aml_alert_transactions_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "aml_alerts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aml_alert_transactions" ADD CONSTRAINT "aml_alert_transactions_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "aml_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investigation_notes" ADD CONSTRAINT "investigation_notes_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "aml_alerts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "aml_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "aml_alerts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_sarDraftId_fkey" FOREIGN KEY ("sarDraftId") REFERENCES "sar_drafts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manual_overrides" ADD CONSTRAINT "manual_overrides_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manual_overrides" ADD CONSTRAINT "manual_overrides_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

