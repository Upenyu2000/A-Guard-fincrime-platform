import assert from "node:assert/strict";
import { test } from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const enabled = process.env.RUN_DATABASE_TESTS === "true";

test(
  "durable ingestion is idempotent, audited, and tenant scoped",
  { skip: !enabled },
  async () => {
    const { PrismaService } = require("../services/api/dist/modules/database/prisma.service.js");
    const { AuditLogService } = require(
      "../services/api/dist/modules/audit-log-service/audit-log-service.service.js"
    );
    const { LiveTransactionService } = require(
      "../services/api/dist/modules/live/live-transaction.service.js"
    );

    const prisma = new PrismaService();
    await prisma.ensureConnected();
    const audit = new AuditLogService(prisma);
    const risk = {
      async score() {
        return {
          score: 72,
          level: "HIGH",
          recommendation: "REVIEW",
          componentScores: { behavioural: 72 },
          reasons: ["velocity_5m"],
          explainability: { method: "test-reason-code" },
          modelVersion: "test-model-1",
          featureVersion: "test-features-1",
          policyVersion: "test-policy-1",
          degraded: false,
        };
      },
    };
    const service = new LiveTransactionService(prisma, risk, audit);
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const tenantA = `tenant-a-${suffix}`;
    const tenantB = `tenant-b-${suffix}`;
    const integrationId = `integration-${suffix}`;
    const externalTransactionId = `external-${suffix}`;
    const idempotencyKey = `idem-${suffix}`;

    const cleanup = async () => {
      await prisma.riskAssessment.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
      await prisma.transactionMonitor.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
      await prisma.rawIngestionEvent.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
      await prisma.outboxEvent.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
      await prisma.idempotencyRecord.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
      await prisma.auditLog.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
      await prisma.integrationConnection.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
      await prisma.tenant.deleteMany({ where: { id: { in: [tenantA, tenantB] } } });
    };

    try {
      await cleanup();
      await prisma.tenant.createMany({
        data: [
          {
            id: tenantA,
            name: "Tenant A",
            type: "test",
            country: "GB",
            status: "active",
            isolationKey: `isolation-a-${suffix}`,
            retentionDays: 30,
          },
          {
            id: tenantB,
            name: "Tenant B",
            type: "test",
            country: "GB",
            status: "active",
            isolationKey: `isolation-b-${suffix}`,
            retentionDays: 30,
          },
        ],
      });
      await prisma.integrationConnection.create({
        data: {
          id: integrationId,
          tenantId: tenantA,
          name: "Test PSP",
          type: "psp",
          provider: "test-provider",
          adapterId: "test-adapter",
          environment: "sandbox",
          authMethods: ["api_key"],
          status: "CONNECTED",
          scopes: ["transactions.read"],
          encryptedCredentialRef: "test-reference",
          credentialFingerprint: `sha256:${"a".repeat(64)}`,
          fieldMappings: {},
          rateLimitPerMinute: 100,
          retryPolicy: "test",
          errors: [],
        },
      });

      const principal = {
        subject: "test-service-account",
        tenantId: tenantA,
        roles: ["institution_partner"],
        scopes: ["transactions.write"],
        issuer: "test",
        audience: ["african-guard-api"],
        authenticationMethods: ["api-key"],
      };
      const request = {
        externalTransactionId,
        integrationId,
        schemaVersion: "1.0",
        rail: "psp",
        eventType: "transaction",
        amount: "125.50",
        currency: "GBP",
        customerId: `customer-${suffix}`,
        eventAt: new Date().toISOString(),
        signals: { velocity_5m: 7 },
      };

      const first = await service.ingest(principal, request, idempotencyKey);
      const second = await service.ingest(principal, request, idempotencyKey);
      assert.equal(first.id, second.id);
      assert.equal(await prisma.transactionMonitor.count({ where: { tenantId: tenantA } }), 1);
      assert.equal(await prisma.riskAssessment.count({ where: { tenantId: tenantA } }), 1);
      assert.equal(await prisma.outboxEvent.count({ where: { tenantId: tenantA } }), 1);
      assert.deepEqual(await service.list(tenantB, 20), { items: [], nextCursor: undefined });
      assert.equal((await audit.verifyChain(tenantA)).valid, true);

      await assert.rejects(
        () => service.ingest(principal, { ...request, amount: "999.00" }, idempotencyKey),
        /different data/u,
      );
    } finally {
      await cleanup();
      await prisma.$disconnect();
    }
  },
);
