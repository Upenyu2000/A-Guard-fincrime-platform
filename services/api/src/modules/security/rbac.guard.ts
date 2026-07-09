import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { createHmac, timingSafeEqual } from "node:crypto";
import { ROLES_KEY } from "./roles.decorator";
import { UserRole } from "../../domain";

const allowedRoles = new Set<UserRole>([
  "analyst",
  "fraud_investigator",
  "compliance_officer",
  "mlro",
  "rule_administrator",
  "internal_auditor",
  "admin",
  "institution_partner",
]);

export interface AuthenticatedUser {
  actor: string;
  role: UserRole;
  institutionId?: string;
  tenantId?: string;
  authMode: "jwt" | "local-development";
}

@Injectable()
export class RbacGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles =
      this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    if (requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
      user?: AuthenticatedUser;
    }>();
    const user = this.userFromRequest(request);
    request.user = user;

    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException("The authenticated user is not permitted to access this resource.");
    }

    return true;
  }

  private userFromRequest(request: { headers: Record<string, string | string[] | undefined> }): AuthenticatedUser {
    const auth = this.header(request.headers, "authorization");
    if (auth?.toLowerCase().startsWith("bearer ")) {
      return this.verifyBearer(auth.slice("bearer ".length).trim());
    }

    const sessionToken = this.cookie(request.headers, "ag_session");
    if (sessionToken) {
      return this.verifyBearer(sessionToken);
    }

    if (this.localHeaderAuthEnabled()) {
      const role = this.normalizedRole(this.header(request.headers, "x-role") ?? "admin");
      const actor = this.header(request.headers, "x-actor") ?? "local-development-user";
      return { role, actor, authMode: "local-development" };
    }

    throw new UnauthorizedException("Authentication is required.");
  }

  private verifyBearer(token: string): AuthenticatedUser {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.includes("<") || secret.length < 24) {
      throw new UnauthorizedException("Authentication is unavailable.");
    }

    const [encodedHeader, encodedPayload, encodedSignature] = token.split(".");
    if (!encodedHeader || !encodedPayload || !encodedSignature) {
      throw new UnauthorizedException("Invalid authentication token.");
    }

    const expected = this.base64Url(createHmac("sha256", secret).update(`${encodedHeader}.${encodedPayload}`).digest());
    const expectedBuffer = Buffer.from(expected);
    const actualBuffer = Buffer.from(encodedSignature);
    if (expectedBuffer.length !== actualBuffer.length || !timingSafeEqual(expectedBuffer, actualBuffer)) {
      throw new UnauthorizedException("Invalid authentication token.");
    }

    const payload = this.parsePayload(encodedPayload);
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      throw new UnauthorizedException("Authentication token has expired.");
    }
    if (!payload.sub || !payload.role) {
      throw new UnauthorizedException("Authentication token is missing required claims.");
    }

    return {
      actor: payload.sub,
      role: this.normalizedRole(payload.role),
      institutionId: payload.institutionId,
      tenantId: payload.tenantId,
      authMode: "jwt",
    };
  }

  private parsePayload(encodedPayload: string) {
    try {
      return JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as {
        sub?: string;
        role?: string;
        institutionId?: string;
        tenantId?: string;
        exp?: number;
      };
    } catch {
      throw new UnauthorizedException("Invalid authentication token.");
    }
  }

  private normalizedRole(value?: string): UserRole {
    const role = value?.toLowerCase() as UserRole | undefined;
    if (!role || !allowedRoles.has(role)) {
      throw new ForbiddenException("The authenticated user role is not permitted.");
    }
    return role;
  }

  private base64Url(value: Buffer) {
    return value.toString("base64").replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
  }

  private localHeaderAuthEnabled() {
    return process.env.NODE_ENV !== "production" && process.env.ALLOW_DEV_HEADER_AUTH !== "false";
  }

  private header(headers: Record<string, string | string[] | undefined>, name: string) {
    const value = headers[name] ?? headers[name.toLowerCase()];
    return Array.isArray(value) ? value[0] : value;
  }

  private cookie(headers: Record<string, string | string[] | undefined>, name: string) {
    const cookieHeader = this.header(headers, "cookie");
    return cookieHeader
      ?.split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${name}=`))
      ?.slice(name.length + 1);
  }
}
