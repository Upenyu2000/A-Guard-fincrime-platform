import { Injectable, UnauthorizedException } from "@nestjs/common";
import {
  KeyObject,
  createPublicKey,
  timingSafeEqual,
  verify as verifySignature,
} from "node:crypto";
import { AuthenticatedPrincipal, supportedRoles } from "./auth.types";
import { UserRole } from "../../domain";

interface JwtHeader {
  alg?: string;
  kid?: string;
  typ?: string;
}

interface JwtPayload {
  sub?: string;
  iss?: string;
  aud?: string | string[];
  exp?: number;
  nbf?: number;
  iat?: number;
  jti?: string;
  tenant_id?: string;
  tenantId?: string;
  roles?: string[] | string;
  scope?: string;
  scp?: string[] | string;
  amr?: string[];
  realm_access?: { roles?: string[] };
}

interface JsonWebKeySet {
  keys: Array<JsonWebKey & { kid?: string; alg?: string; use?: string }>;
}

interface CachedJwks {
  expiresAt: number;
  keys: Map<string, KeyObject>;
}

const decodeBase64Url = (value: string): Buffer => Buffer.from(value, "base64url");

const parseJsonPart = <T>(value: string, label: string): T => {
  try {
    return JSON.parse(decodeBase64Url(value).toString("utf8")) as T;
  } catch {
    throw new UnauthorizedException(`Access token ${label} is malformed.`);
  }
};

const stringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  if (typeof value === "string") return value.split(/[ ,]+/u).filter(Boolean);
  return [];
};

@Injectable()
export class TokenVerifierService {
  private cachedJwks?: CachedJwks;
  private cachedJwksUri?: string;

  async verifyAccessToken(token: string): Promise<AuthenticatedPrincipal> {
    const environment = process.env.NODE_ENV ?? "development";
    if (environment !== "production" && process.env.ALLOW_DEV_AUTH === "true") {
      const devToken = process.env.DEV_BEARER_TOKEN;
      if (devToken && this.constantTimeEqual(token, devToken)) {
        return this.developmentPrincipal();
      }
    }

    const issuer = process.env.OAUTH_ISSUER_URL?.replace(/\/$/u, "");
    const audience = process.env.OAUTH_AUDIENCE;
    if (!issuer || !audience) {
      throw new UnauthorizedException("OIDC authentication is not configured.");
    }

    const parts = token.split(".");
    if (parts.length !== 3) {
      throw new UnauthorizedException("Access token must be a signed JWT.");
    }

    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const header = parseJsonPart<JwtHeader>(encodedHeader!, "header");
    const payload = parseJsonPart<JwtPayload>(encodedPayload!, "payload");

    const allowedAlgorithms = new Set(
      (process.env.OAUTH_ALLOWED_ALGORITHMS ?? "RS256")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    );
    if (!header.alg || !allowedAlgorithms.has(header.alg)) {
      throw new UnauthorizedException("Access token uses a disallowed signing algorithm.");
    }
    if (!header.kid) {
      throw new UnauthorizedException("Access token does not identify a signing key.");
    }

    const key = await this.signingKey(header.kid, header.alg);
    const signatureAlgorithm = this.nodeSignatureAlgorithm(header.alg);
    const signedData = Buffer.from(`${encodedHeader}.${encodedPayload}`, "utf8");
    const signature = decodeBase64Url(encodedSignature!);
    if (!verifySignature(signatureAlgorithm, signedData, key, signature)) {
      throw new UnauthorizedException("Access token signature is invalid.");
    }

    this.validateClaims(payload, issuer, audience);
    return this.toPrincipal(payload, audience);
  }

  private validateClaims(payload: JwtPayload, issuer: string, expectedAudience: string): void {
    const now = Math.floor(Date.now() / 1000);
    const skew = Number(process.env.OAUTH_CLOCK_SKEW_SECONDS ?? 60);

    if (payload.iss !== issuer) {
      throw new UnauthorizedException("Access token issuer is invalid.");
    }
    const audiences = stringArray(payload.aud);
    if (!audiences.includes(expectedAudience)) {
      throw new UnauthorizedException("Access token audience is invalid.");
    }
    if (!payload.sub) {
      throw new UnauthorizedException("Access token subject is missing.");
    }
    if (!payload.exp || payload.exp < now - skew) {
      throw new UnauthorizedException("Access token has expired.");
    }
    if (payload.nbf && payload.nbf > now + skew) {
      throw new UnauthorizedException("Access token is not active yet.");
    }
    if (payload.iat && payload.iat > now + skew) {
      throw new UnauthorizedException("Access token issue time is invalid.");
    }
  }

  private toPrincipal(payload: JwtPayload, expectedAudience: string): AuthenticatedPrincipal {
    const tenantId = payload.tenant_id ?? payload.tenantId;
    if (!tenantId) {
      throw new UnauthorizedException("Access token does not contain a tenant claim.");
    }

    const roleCandidates = [
      ...stringArray(payload.roles),
      ...stringArray(payload.realm_access?.roles),
    ].map((role) => role.toLowerCase());
    const roles = [...new Set(roleCandidates)].filter((role): role is UserRole =>
      supportedRoles.has(role as UserRole),
    );
    if (roles.length === 0) {
      throw new UnauthorizedException("Access token does not contain a supported role.");
    }

    return {
      subject: payload.sub!,
      tenantId,
      roles,
      scopes: [...new Set([...stringArray(payload.scope), ...stringArray(payload.scp)])],
      issuer: payload.iss!,
      audience: stringArray(payload.aud).length ? stringArray(payload.aud) : [expectedAudience],
      tokenId: payload.jti,
      authenticationMethods: stringArray(payload.amr),
    };
  }

  private developmentPrincipal(): AuthenticatedPrincipal {
    const tenantId = process.env.DEV_TENANT_ID;
    const subject = process.env.DEV_USER_ID;
    const roles = stringArray(process.env.DEV_USER_ROLES)
      .map((role) => role.toLowerCase())
      .filter((role): role is UserRole => supportedRoles.has(role as UserRole));

    if (!tenantId || !subject || roles.length === 0) {
      throw new UnauthorizedException(
        "Development authentication requires DEV_TENANT_ID, DEV_USER_ID, and DEV_USER_ROLES.",
      );
    }

    return {
      subject,
      tenantId,
      roles,
      scopes: stringArray(process.env.DEV_USER_SCOPES),
      issuer: "development",
      audience: ["african-guard-local"],
      authenticationMethods: ["development-token"],
    };
  }

  private async signingKey(kid: string, algorithm: string): Promise<KeyObject> {
    const now = Date.now();
    if (!this.cachedJwks || this.cachedJwks.expiresAt <= now) {
      await this.refreshJwks();
    }

    let key = this.cachedJwks?.keys.get(kid);
    if (!key) {
      await this.refreshJwks(true);
      key = this.cachedJwks?.keys.get(kid);
    }
    if (!key) {
      throw new UnauthorizedException(`No OIDC signing key exists for kid ${kid}.`);
    }

    if (!algorithm.startsWith("RS")) {
      throw new UnauthorizedException(`Signing algorithm ${algorithm} is not implemented.`);
    }
    return key;
  }

  private async refreshJwks(forceDiscovery = false): Promise<void> {
    const issuer = process.env.OAUTH_ISSUER_URL?.replace(/\/$/u, "");
    if (!issuer) throw new UnauthorizedException("OIDC issuer is not configured.");

    if (!this.cachedJwksUri || forceDiscovery) {
      this.cachedJwksUri = process.env.OAUTH_JWKS_URL ?? (await this.discoverJwksUri(issuer));
    }

    const response = await fetch(this.cachedJwksUri, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(Number(process.env.OAUTH_HTTP_TIMEOUT_MS ?? 5000)),
    });
    if (!response.ok) {
      throw new UnauthorizedException("Unable to retrieve OIDC signing keys.");
    }

    const jwks = (await response.json()) as JsonWebKeySet;
    const keys = new Map<string, KeyObject>();
    for (const jwk of jwks.keys ?? []) {
      if (!jwk.kid || (jwk.use && jwk.use !== "sig")) continue;
      try {
        keys.set(jwk.kid, createPublicKey({ key: jwk, format: "jwk" }));
      } catch {
        // Ignore unsupported keys; a token using one will fail closed below.
      }
    }
    if (keys.size === 0) {
      throw new UnauthorizedException("OIDC provider returned no usable signing keys.");
    }

    this.cachedJwks = {
      keys,
      expiresAt: Date.now() + Number(process.env.OAUTH_JWKS_CACHE_MS ?? 300_000),
    };
  }

  private async discoverJwksUri(issuer: string): Promise<string> {
    const response = await fetch(`${issuer}/.well-known/openid-configuration`, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(Number(process.env.OAUTH_HTTP_TIMEOUT_MS ?? 5000)),
    });
    if (!response.ok) {
      throw new UnauthorizedException("Unable to retrieve OIDC discovery metadata.");
    }
    const metadata = (await response.json()) as { jwks_uri?: string };
    if (!metadata.jwks_uri) {
      throw new UnauthorizedException("OIDC discovery metadata does not contain jwks_uri.");
    }
    return metadata.jwks_uri;
  }

  private nodeSignatureAlgorithm(algorithm: string): string {
    const algorithms: Record<string, string> = {
      RS256: "RSA-SHA256",
      RS384: "RSA-SHA384",
      RS512: "RSA-SHA512",
    };
    const mapped = algorithms[algorithm];
    if (!mapped) throw new UnauthorizedException(`Signing algorithm ${algorithm} is not supported.`);
    return mapped;
  }

  private constantTimeEqual(left: string, right: string): boolean {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);
    return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
  }
}
