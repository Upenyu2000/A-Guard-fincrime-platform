import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { AuthenticatedRequest } from "./auth.types";

/**
 * Prevents the seed-backed in-memory operating store from being mistaken for a live production
 * datastore. Remove this guard only after controllers have been migrated to tenant-scoped Prisma
 * repositories and the replacement is covered by isolation and recovery tests.
 */
@Injectable()
export class ProductionSafetyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    if ((process.env.NODE_ENV ?? "development") !== "production") return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const route = (request.originalUrl ?? request.url ?? "").split("?")[0];
    if (route === "/v1/health" || route === "/v1/health/live") return true;

    throw new ServiceUnavailableException({
      code: "PRODUCTION_DATASTORE_NOT_MIGRATED",
      message:
        "Live processing is disabled because this route still depends on the seed-backed in-memory store.",
      remediation:
        "Migrate the route to tenant-scoped Prisma repositories, durable queues, and verified readiness checks before enabling production traffic.",
    });
  }
}
