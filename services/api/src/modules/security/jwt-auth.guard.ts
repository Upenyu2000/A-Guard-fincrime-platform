import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ApiKeyService } from "../api-key-service/api-key-service.service";
import { IS_PUBLIC_KEY } from "./public.decorator";
import { AuthenticatedPrincipal, AuthenticatedRequest } from "./auth.types";
import { TokenVerifierService } from "./token-verifier.service";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokenVerifier: TokenVerifierService,
    private readonly apiKeyService: ApiKeyService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const route = (request.originalUrl ?? request.url ?? "").split("?")[0] ?? "";
    const isExplicitlyPublic =
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? false;
    const isHealthCheck =
      route === "/v1/health" ||
      route === "/v1/health/live" ||
      route === "/v1/live/health/live" ||
      route === "/v1/live/health/ready";
    const isSignedWebhook = /^\/v1\/(?:live\/)?webhooks\/[^/]+$/u.test(route);

    if (isExplicitlyPublic || isHealthCheck) {
      request.user = this.publicPrincipal();
      return true;
    }
    if (isSignedWebhook) return true;

    delete request.headers["x-role"];
    delete request.headers["x-actor"];
    delete request.headers["x-tenant-id"];

    const authorizationValue = request.headers.authorization;
    const authorization = Array.isArray(authorizationValue)
      ? authorizationValue[0]
      : authorizationValue;
    const apiKeyHeaderValue = request.headers["x-api-key"];
    const apiKeyHeader = Array.isArray(apiKeyHeaderValue)
      ? apiKeyHeaderValue[0]
      : apiKeyHeaderValue;

    let principal: AuthenticatedPrincipal;
    if (authorization?.startsWith("Bearer ")) {
      const token = authorization.slice("Bearer ".length).trim();
      if (!token) throw new UnauthorizedException("A bearer access token is required.");
      principal = await this.tokenVerifier.verifyAccessToken(token);
    } else {
      const apiKey = authorization?.startsWith("ApiKey ")
        ? authorization.slice("ApiKey ".length).trim()
        : apiKeyHeader?.trim();
      if (!apiKey) {
        throw new UnauthorizedException(
          "A bearer access token or scoped API key is required.",
        );
      }
      principal = await this.apiKeyService.authenticate(
        apiKey,
        request.ip ?? request.socket?.remoteAddress,
      );
    }

    request.user = principal;
    request.headers["x-actor"] = principal.subject;
    request.headers["x-role"] = principal.roles[0] ?? "analyst";
    request.headers["x-tenant-id"] = principal.tenantId;
    return true;
  }

  private publicPrincipal(): AuthenticatedPrincipal {
    return {
      subject: "public-health-check",
      tenantId: "system",
      roles: ["auditor"],
      scopes: ["health.read"],
      issuer: "african-guard-system",
      audience: ["african-guard-api"],
      authenticationMethods: ["public-endpoint"],
    };
  }
}
