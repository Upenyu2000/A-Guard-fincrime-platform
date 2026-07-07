import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
} from "@nestjs/common";
import { AuthenticatedRequest } from "./auth.types";
import { WebhookService } from "../webhook-service/webhook-service.service";

@Injectable()
export class WebhookVerificationGuard implements CanActivate {
  constructor(private readonly webhookService: WebhookService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const route = (request.originalUrl ?? request.url ?? "").split("?")[0] ?? "";
    const match = route.match(/^\/v1\/webhooks\/([^/]+)$/u);
    if (!match) return true;

    const integrationId = decodeURIComponent(match[1]!);
    if (!request.rawBody) {
      throw new BadRequestException("Raw webhook body is unavailable for signature verification.");
    }

    const verification = await this.webhookService.verify({
      integrationId,
      rawBody: request.rawBody,
      signature: this.header(request, "x-webhook-signature"),
      timestamp: this.header(request, "x-webhook-timestamp"),
      eventId: this.header(request, "x-webhook-id"),
    });

    request.headers["x-webhook-verified"] = "true";
    request.headers["x-webhook-event-id"] = verification.eventId;
    return true;
  }

  private header(request: AuthenticatedRequest, name: string): string {
    const value = request.headers[name];
    return Array.isArray(value) ? value[0] ?? "" : value ?? "";
  }
}
