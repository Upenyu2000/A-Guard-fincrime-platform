import { Injectable } from "@nestjs/common";
import { AuditOutcome, Prisma, PrismaClient } from "@prisma/client";
import { createHash } from "node:crypto";
import { PrismaService } from "../database/prisma.service";

export interface AuditWriteInput {
  tenantId: string;
  actor: string;
  role: string;
  action: string;
  target: string;
  outcome?: AuditOutcome;
  requestId?: string;
  correlationId?: string;
  traceId?: string;
  metadata?: Record<string, unknown>;
}

type AuditClient = Prisma.TransactionClient | PrismaClient;

@Injectable()
export class AuditLogService {
  readonly boundary = "audit-log-service";
  readonly responsibilities = ["append_only_audit_events", "hash_chaining", "audit_export"];

  constructor(private readonly prisma: PrismaService) {}

  async append(input: AuditWriteInput, client?: AuditClient) {
    const database = client ?? this.prisma;
    if (!client) await this.prisma.ensureConnected();

    // Serialise each tenant's chain inside database transactions. PostgreSQL advisory transaction
    // locks are automatically released at commit/rollback.
    if ("$executeRaw" in database) {
      await database.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`audit:${input.tenantId}`}))`;
    }

    const previous = await database.auditLog.findFirst({
      where: { tenantId: input.tenantId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: { recordHash: true },
    });
    const createdAt = new Date();
    const previousHash = previous?.recordHash ?? null;
    const metadata = this.json(input.metadata ?? {});
    const recordHash = this.hash({
      tenantId: input.tenantId,
      actor: input.actor,
      role: input.role,
      action: input.action,
      target: input.target,
      outcome: input.outcome ?? AuditOutcome.SUCCESS,
      requestId: input.requestId ?? null,
      correlationId: input.correlationId ?? null,
      traceId: input.traceId ?? null,
      metadata,
      previousHash,
      createdAt: createdAt.toISOString(),
    });

    return database.auditLog.create({
      data: {
        tenantId: input.tenantId,
        actor: input.actor,
        role: input.role,
        action: input.action,
        target: input.target,
        outcome: input.outcome ?? AuditOutcome.SUCCESS,
        requestId: input.requestId,
        correlationId: input.correlationId,
        traceId: input.traceId,
        metadata,
        previousHash,
        recordHash,
        createdAt,
      },
    });
  }

  async verifyChain(tenantId: string): Promise<{
    valid: boolean;
    checked: number;
    firstInvalidId?: string;
  }> {
    await this.prisma.ensureConnected();
    const records = await this.prisma.auditLog.findMany({
      where: { tenantId },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });

    let previousHash: string | null = null;
    for (const record of records) {
      const expected = this.hash({
        tenantId: record.tenantId,
        actor: record.actor,
        role: record.role,
        action: record.action,
        target: record.target,
        outcome: record.outcome,
        requestId: record.requestId,
        correlationId: record.correlationId,
        traceId: record.traceId,
        metadata: record.metadata,
        previousHash,
        createdAt: record.createdAt.toISOString(),
      });
      if (record.previousHash !== previousHash || record.recordHash !== expected) {
        return { valid: false, checked: records.indexOf(record), firstInvalidId: record.id };
      }
      previousHash = record.recordHash;
    }
    return { valid: true, checked: records.length };
  }

  private hash(value: unknown): string {
    return createHash("sha256").update(this.stableStringify(value), "utf8").digest("hex");
  }

  private stableStringify(value: unknown): string {
    if (value === null || typeof value !== "object") return JSON.stringify(value);
    if (Array.isArray(value)) return `[${value.map((item) => this.stableStringify(item)).join(",")}]`;
    const entries = Object.entries(value as Record<string, unknown>).sort(([left], [right]) =>
      left.localeCompare(right),
    );
    return `{${entries
      .map(([key, item]) => `${JSON.stringify(key)}:${this.stableStringify(item)}`)
      .join(",")}}`;
  }

  private json(value: Record<string, unknown>): Prisma.InputJsonObject {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonObject;
  }
}
