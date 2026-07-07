import { ConflictException, ForbiddenException, Injectable } from "@nestjs/common";
import { Prisma, ProcessingStatus } from "@prisma/client";
import { createHash } from "node:crypto";
import { AuditLogService } from "../audit-log-service/audit-log-service.service";
import { PrismaService } from "../database/prisma.service";
import { AuthenticatedPrincipal } from "../security/auth.types";

@Injectable()
export class LiveWebhookService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {}

  async receive(input: {
    principal: AuthenticatedPrincipal;
    integrationId: string;
    providerEventId: string;
    rawBody: Buffer;
    payload: Record<string, unknown>;
  }) {
    await this.prisma.ensureConnected();
    const integration = await this.prisma.integrationConnection.findFirst({
      where: { id: input.integrationId, tenantId: input.principal.tenantId },
      select: { id: true, tenantId: true },
    });
    if (!integration) {
      throw new ForbiddenException("Webhook integration does not belong to the verified tenant.");
    }

    const payloadHash = createHash("sha256").update(input.rawBody).digest("hex");
    try {
      return await this.prisma.$transaction(async (tx) => {
        const event = await tx.webhookEvent.create({
          data: {
            tenantId: integration.tenantId,
            integrationId: integration.id,
            providerEventId: input.providerEventId,
            signatureVerified: true,
            payloadHash,
            status: ProcessingStatus.VALIDATED,
          },
        });
        await tx.outboxEvent.create({
          data: {
            tenantId: integration.tenantId,
            topic: "provider-webhooks.v1",
            eventKey: event.id,
            eventType: "provider.webhook.received",
            schemaVersion: "1.0",
            payload: this.json(input.payload),
            headers: this.json({
              integrationId: integration.id,
              providerEventId: input.providerEventId,
              payloadHash,
            }),
          },
        });
        await this.audit.append(
          {
            tenantId: integration.tenantId,
            actor: input.principal.subject,
            role: "institution_partner",
            action: "webhook.received",
            target: event.id,
            correlationId: input.providerEventId,
            metadata: { integrationId: integration.id, payloadHash },
          },
          tx,
        );
        return {
          accepted: true,
          eventId: event.id,
          providerEventId: input.providerEventId,
          status: event.status,
        };
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictException("Webhook event was already received.");
      }
      throw error;
    }
  }

  private json(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }
}
