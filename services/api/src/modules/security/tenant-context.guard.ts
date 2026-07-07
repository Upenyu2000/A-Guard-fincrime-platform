import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  GoneException,
  Injectable,
} from "@nestjs/common";
import { AuthenticatedRequest } from "./auth.types";

@Injectable()
export class TenantContextGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const route = (request.originalUrl ?? request.url ?? "").split("?")[0] ?? "";

    if (route.includes("/health/")) return true;
    if (/^\/v1\/(?:live\/)?webhooks\/[^/]+$/u.test(route)) return true;

    if (route === "/v1/agents/osint") {
      throw new GoneException(
        "The ungoverned OSINT endpoint is disabled. Use /v1/osint/identity-search with an active case, lawful basis, purpose, and approved investigator identity.",
      );
    }

    const principal = request.user;
    if (!principal) return true;
    const body = request.body;
    if (!body || typeof body !== "object") return true;

    const requestedTenant = body.tenantId;
    if (typeof requestedTenant === "string" && requestedTenant !== principal.tenantId) {
      throw new ForbiddenException(
        "The requested tenant does not match the authenticated tenant claim.",
      );
    }

    if ("tenantId" in body) body.tenantId = principal.tenantId;
    if ("investigatorId" in body) body.investigatorId = principal.subject;
    if ("capturedBy" in body) body.capturedBy = principal.subject;
    if ("analyst" in body) body.analyst = principal.subject;
    return true;
  }
}
