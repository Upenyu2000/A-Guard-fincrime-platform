import { Injectable } from "@nestjs/common";
import { IntegrationStatus, Prisma } from "@prisma/client";
import { ApiKeyService } from "../api-key-service/api-key-service.service";
import { AuditLogService } from "../audit-log-service/audit-log-service.service";
import { PrismaService } from "../database/prisma.service";
import { AuthenticatedPrincipal } from "../security/auth.types";
import { CreateLiveApiKeyDto, CreateLiveIntegrationDto } from "./live.dto";

@Injectable()
export class LiveIntegrationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
    private readonly apiKeys: ApiKeyService,
  ) {}

  async list(tenantId: string, limit: number, cursor?: string) {
    await this.prisma.ensureConnected();
    const rows = await this.prisma.integrationConnection.findMany({
      where: { tenantId },
      orderBy: { id: "asc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        name: true,
        type: true,
        provider: true,
        adapterId: true,
        environment: true,
        status: true,
        authMethods: true,
        scopes: true,
        fieldMappings: true,
        webhook: true,
        lastSyncAt: true,
        lastSuccessfulSyncAt: true,
        dataVolume24h: true,
        totalTransactionsIngested: true,
        rateLimitPerMinute: true,
        errors: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    return {
      items: items.map((item) => ({
        ...item,
        totalTransactionsIngested: item.totalTransactionsIngested.toString(),
      })),
      nextCursor: hasMore ? items.at(-1)?.id : undefined,
    };
  }

  async create(principal: AuthenticatedPrincipal, dto: CreateLiveIntegrationDto) {
    await this.prisma.ensureConnected();
    return this.prisma.$transaction(async (tx) => {
      const created = await tx.integrationConnection.create({
        data: {
          tenantId: principal.tenantId,
          name: dto.name.trim(),
          type: dto.type,
          provider: dto.provider.trim(),
          adapterId: dto.adapterId.trim(),
          environment: dto.environment,
          authMethods: dto.authMethods,
          status: IntegrationStatus.DRAFT,
          scopes: dto.scopes,
          encryptedCredentialRef: dto.credentialReference,
          credentialFingerprint: dto.credentialFingerprint,
          fieldMappings: this.json(dto.fieldMappings ?? {}),
          webhook: dto.webhook ? this.json(dto.webhook) : Prisma.JsonNull,
          rateLimitPerMinute: dto.rateLimitPerMinute,
          retryPolicy: "exponential-backoff-with-jitter",
          errors: [],
        },
      });
      await this.audit.append(
        {
          tenantId: principal.tenantId,
          actor: principal.subject,
          role: principal.roles[0] ?? "unknown",
          action: "integration.created",
          target: created.id,
          metadata: {
            provider: created.provider,
            type: created.type,
            environment: created.environment,
          },
        },
        tx,
      );
      return {
        id: created.id,
        tenantId: created.tenantId,
        name: created.name,
        type: created.type,
        provider: created.provider,
        adapterId: created.adapterId,
        environment: created.environment,
        status: created.status,
        credentialFingerprint: created.credentialFingerprint,
        createdAt: created.createdAt,
      };
    });
  }

  async createApiKey(principal: AuthenticatedPrincipal, dto: CreateLiveApiKeyDto) {
    const created = await this.apiKeys.create({
      tenantId: principal.tenantId,
      name: dto.name,
      scopes: dto.scopes,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      allowedIps: dto.allowedIps,
    });
    await this.prisma.$transaction((tx) =>
      this.audit.append(
        {
          tenantId: principal.tenantId,
          actor: principal.subject,
          role: principal.roles[0] ?? "unknown",
          action: "api_key.created",
          target: created.id,
          metadata: { prefix: created.prefix, scopes: created.scopes },
        },
        tx,
      ),
    );
    return created;
  }

  private json(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }
}
