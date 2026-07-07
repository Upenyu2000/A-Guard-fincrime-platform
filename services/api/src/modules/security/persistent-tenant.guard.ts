import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { MembershipStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../database/prisma.service";
import { AuthenticatedRequest, supportedRoles } from "./auth.types";
import { UserRole } from "../../domain";

@Injectable()
export class PersistentTenantGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const route = (request.originalUrl ?? request.url ?? "").split("?")[0] ?? "";
    if (!route.startsWith("/v1/live/")) return true;
    if (route.startsWith("/v1/live/health/")) return true;

    const principal = request.user;
    if (!principal || principal.tenantId === "system") {
      throw new ForbiddenException("A verified tenant identity is required.");
    }

    try {
      await this.prisma.ensureConnected();
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: principal.tenantId },
        select: { id: true, status: true },
      });
      if (!tenant || tenant.status.toLowerCase() !== "active") {
        throw new ForbiddenException("The authenticated tenant is not active.");
      }

      if (principal.authenticationMethods.includes("api-key")) return true;

      const user = await this.prisma.user.findUnique({
        where: { externalSubject: principal.subject },
        include: {
          memberships: {
            where: {
              tenantId: principal.tenantId,
              status: MembershipStatus.ACTIVE,
            },
            take: 1,
          },
        },
      });
      const membership = user?.memberships[0];
      if (!user || user.status.toLowerCase() !== "active" || !membership) {
        throw new ForbiddenException(
          "The authenticated user does not have an active membership in this tenant.",
        );
      }

      const membershipRoles = this.roles(membership.roles);
      const effectiveRoles = principal.roles.filter((role) => membershipRoles.includes(role));
      if (effectiveRoles.length === 0) {
        throw new ForbiddenException("No active application roles are assigned for this tenant.");
      }

      principal.roles = effectiveRoles;
      principal.scopes = this.intersectScopes(principal.scopes, this.stringArray(membership.scopes));
      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) throw error;
      throw new ServiceUnavailableException(
        "Tenant membership verification is unavailable; access is failing closed.",
      );
    }
  }

  private roles(value: Prisma.JsonValue): UserRole[] {
    return this.stringArray(value).filter((role): role is UserRole =>
      supportedRoles.has(role as UserRole),
    );
  }

  private stringArray(value: Prisma.JsonValue): string[] {
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  }

  private intersectScopes(tokenScopes: string[], membershipScopes: string[]): string[] {
    if (tokenScopes.length === 0) return membershipScopes;
    return tokenScopes.filter((tokenScope) =>
      membershipScopes.some(
        (membershipScope) =>
          membershipScope === "*" ||
          membershipScope === tokenScope ||
          (membershipScope.endsWith(".*") && tokenScope.startsWith(membershipScope.slice(0, -1))),
      ),
    );
  }
}
