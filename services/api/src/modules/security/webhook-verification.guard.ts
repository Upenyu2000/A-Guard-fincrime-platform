import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { WebhookService } from "../webhook-service/webhook-service.service";
import { AuthenticatedRequest } from "./auth.types";

@Injectable()
export class WebhookVerificationGuard implements CanActivate {
  constructor(
    private readonly verifier: WebhookService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const route = (request.originalUrl ?? request.url ?? "").split("?")[0] ?? "";
    const match = route.match(/^\/v1\/(?:live\/)?webhooks\/([^/]+)$/u);
    if (!match) return true;
    if (!request.rawBody) throw new BadRequestException("Raw webhook body is required.");

    const integrationId = decodeURIComponent(match[1]!);
    const result = await this.verifier.verify({
      integrationId,
      rawBody: request.rawBody,
      signature: this.header(request, "x-webhook-signature"),
      timestamp: this.header(request, "x-webhook-timestamp"),
      eventId: this.header(request, "x-webhook-id"),
    });

    await this.prisma.ensureConnected();
    const integration = await this.prisma.integrationConnection.findUnique({
      where: { id: integrationId },
      select: { tenantId: true },
    });
    if (!integration) throw new NotFoundException("Webhook integration was not found.");

    request.headers["x-webhook-verified"] = "true";
    request.headers["x-webhook-event-id"] = result.eventId;
    request.user = {
      subject: `provider:${integrationId}`,
      tenantId: integration.tenantId,
      roles: ["institution_partner"],
      scopes: ["webhooks.ingest"],
      issuer: "african-guard-webhook-verifier",
      audience: ["african-guard-api"],
      tokenId: result.eventId,
      authenticationMethods: ["signed-webhook"],
    };
    return true;
  }

  private header(request: AuthenticatedRequest, name: string): string {
    const value = request.headers[name];
    return Array.isArray(value) ? value[0] ?? "" : value ?? "";
  }
}
