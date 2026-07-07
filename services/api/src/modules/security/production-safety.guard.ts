import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { AuthenticatedRequest } from "./auth.types";

/**
 * Keeps seed-backed legacy routes unavailable in production while allowing the durable /v1/live
 * API, which is backed by tenant-scoped repositories and dependency readiness checks.
 */
@Injectable()
export class ProductionSafetyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    if ((process.env.NODE_ENV ?? "development") !== "production") return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const route = (request.originalUrl ?? request.url ?? "").split("?")[0] ?? "";
    if (route === "/v1/health" || route === "/v1/health/live") return true;
    if (route.startsWith("/v1/live/")) return true;

    throw new ServiceUnavailableException({
      code: "LEGACY_ROUTE_DISABLED_IN_PRODUCTION",
      message: "This endpoint still depends on the seed-backed legacy operating store.",
      remediation: "Use the tenant-scoped /v1/live API or complete the repository migration.",
    });
  }
}
