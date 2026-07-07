import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY } from "./public.decorator";
import { AuthenticatedRequest } from "./auth.types";
import { TokenVerifierService } from "./token-verifier.service";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokenVerifier: TokenVerifierService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const route = (request.originalUrl ?? request.url ?? "").split("?")[0] ?? "";
    const isExplicitlyPublic =
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? false;
    const isHealthCheck = route === "/v1/health" || route === "/v1/health/live";
    const isSignedWebhook = /^\/v1\/webhooks\/[^/]+$/u.test(route);
    if (isExplicitlyPublic || isHealthCheck || isSignedWebhook) return true;

    // Remove all caller-supplied compatibility identity headers before authentication.
    delete request.headers["x-role"];
    delete request.headers["x-actor"];
    delete request.headers["x-tenant-id"];

    const authorization = request.headers.authorization;
    const raw = Array.isArray(authorization) ? authorization[0] : authorization;
    if (!raw?.startsWith("Bearer ")) {
      throw new UnauthorizedException("A bearer access token is required.");
    }

    const token = raw.slice("Bearer ".length).trim();
    if (!token) throw new UnauthorizedException("A bearer access token is required.");

    const principal = await this.tokenVerifier.verifyAccessToken(token);
    request.user = principal;

    // Transitional compatibility for legacy controller methods. These values are server-derived
    // and overwrite anything supplied by the caller. New code must read request.user directly.
    request.headers["x-actor"] = principal.subject;
    request.headers["x-role"] = principal.roles[0] ?? "analyst";
    request.headers["x-tenant-id"] = principal.tenantId;
    return true;
  }
}
