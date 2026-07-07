import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthenticatedRequest } from "./auth.types";
import { SCOPES_KEY } from "./scopes.decorator";

@Injectable()
export class ScopeGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredScopes =
      this.reflector.getAllAndOverride<string[]>(SCOPES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];
    if (requiredScopes.length === 0) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const principal = request.user;
    if (!principal) return false;

    // Human tenant administrators remain constrained by tenant isolation but may perform
    // administrative operations without every IdP emitting application-specific scopes.
    if (principal.roles.includes("admin") && !principal.authenticationMethods.includes("api-key")) {
      return true;
    }

    const missing = requiredScopes.filter(
      (required) => !principal.scopes.some((granted) => this.matches(granted, required)),
    );
    if (missing.length > 0) {
      throw new ForbiddenException(`Missing required scopes: ${missing.join(", ")}.`);
    }
    return true;
  }

  private matches(granted: string, required: string): boolean {
    if (granted === required || granted === "*") return true;
    if (!granted.endsWith(".*")) return false;
    return required.startsWith(granted.slice(0, -1));
  }
}
