import {
  ForbiddenException,
  Injectable,
  OnModuleDestroy,
  UnauthorizedException,
} from "@nestjs/common";
import { ApiKeyStatus, Prisma } from "@prisma/client";
import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { PrismaService } from "../database/prisma.service";
import { AuthenticatedPrincipal } from "../security/auth.types";

export interface CreateApiKeyInput {
  tenantId: string;
  name: string;
  scopes: string[];
  expiresAt?: Date;
  allowedIps?: string[];
}

export interface CreatedApiKey {
  id: string;
  tenantId: string;
  name: string;
  prefix: string;
  scopes: string[];
  expiresAt?: string;
  apiKey: string;
}

@Injectable()
export class ApiKeyService implements OnModuleDestroy {
  readonly boundary = "api-key-service";
  readonly responsibilities = ["key_generation", "secure_hash_storage", "scope_enforcement", "rotation"];

  private readonly pepper: Buffer;

  constructor(private readonly prisma: PrismaService) {
    const configured = process.env.API_KEY_PEPPER;
    if (configured) {
      const decoded = Buffer.from(configured, "base64");
      if (decoded.length < 32) {
        throw new Error("API_KEY_PEPPER must decode to at least 32 bytes.");
      }
      this.pepper = decoded;
      return;
    }

    if ((process.env.NODE_ENV ?? "development") === "production") {
      throw new Error("API_KEY_PEPPER must be supplied by the production secret manager.");
    }
    this.pepper = randomBytes(32);
  }

  async onModuleDestroy(): Promise<void> {
    this.pepper.fill(0);
  }

  async create(input: CreateApiKeyInput): Promise<CreatedApiKey> {
    const scopes = this.normaliseScopes(input.scopes);
    if (scopes.length === 0) throw new ForbiddenException("At least one API scope is required.");

    await this.prisma.ensureConnected();
    const prefix = randomBytes(9).toString("base64url");
    const secret = randomBytes(32).toString("base64url");
    const apiKey = `agk_${prefix}_${secret}`;
    const secretHash = this.hash(apiKey);
    const fingerprint = `sha256:${createHash("sha256").update(apiKey).digest("hex")}`;

    const record = await this.prisma.developerApiKey.create({
      data: {
        tenantId: input.tenantId,
        name: input.name.trim(),
        prefix,
        secretHash,
        fingerprint,
        scopes,
        allowedIps: input.allowedIps ?? [],
        status: ApiKeyStatus.ACTIVE,
        expiresAt: input.expiresAt,
      },
    });

    return {
      id: record.id,
      tenantId: record.tenantId,
      name: record.name,
      prefix: record.prefix,
      scopes,
      expiresAt: record.expiresAt?.toISOString(),
      apiKey,
    };
  }

  async authenticate(rawApiKey: string, sourceIp?: string): Promise<AuthenticatedPrincipal> {
    const parsed = /^agk_([A-Za-z0-9_-]{8,32})_([A-Za-z0-9_-]{32,})$/u.exec(rawApiKey);
    if (!parsed) throw new UnauthorizedException("API key format is invalid.");

    await this.prisma.ensureConnected();
    const record = await this.prisma.developerApiKey.findFirst({
      where: {
        prefix: parsed[1],
        status: { in: [ApiKeyStatus.ACTIVE, ApiKeyStatus.ROTATING] },
      },
    });
    if (!record || !this.safeEqual(record.secretHash, this.hash(rawApiKey))) {
      throw new UnauthorizedException("API key is invalid.");
    }
    if (record.revokedAt || (record.expiresAt && record.expiresAt <= new Date())) {
      throw new UnauthorizedException("API key has expired or been revoked.");
    }

    const allowedIps = this.stringArray(record.allowedIps);
    if (allowedIps.length > 0 && (!sourceIp || !allowedIps.includes(sourceIp))) {
      throw new ForbiddenException("API key is not permitted from this source address.");
    }

    await this.prisma.developerApiKey.update({
      where: { id: record.id },
      data: { lastUsedAt: new Date() },
    });

    return {
      subject: `api-key:${record.id}`,
      tenantId: record.tenantId,
      roles: ["institution_partner"],
      scopes: this.stringArray(record.scopes),
      issuer: "african-guard-api-key",
      audience: ["african-guard-api"],
      tokenId: record.id,
      authenticationMethods: ["api-key"],
    };
  }

  async revoke(tenantId: string, id: string): Promise<void> {
    await this.prisma.ensureConnected();
    const result = await this.prisma.developerApiKey.updateMany({
      where: { id, tenantId },
      data: { status: ApiKeyStatus.REVOKED, revokedAt: new Date() },
    });
    if (result.count !== 1) throw new UnauthorizedException("API key was not found for this tenant.");
  }

  private hash(value: string): string {
    return createHmac("sha256", this.pepper).update(value, "utf8").digest("hex");
  }

  private safeEqual(left: string, right: string): boolean {
    const leftBuffer = Buffer.from(left, "hex");
    const rightBuffer = Buffer.from(right, "hex");
    return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
  }

  private normaliseScopes(scopes: string[]): string[] {
    return [...new Set(scopes.map((scope) => scope.trim()).filter((scope) => /^[a-z][a-z0-9_.:-]{2,100}$/u.test(scope)))];
  }

  private stringArray(value: Prisma.JsonValue): string[] {
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  }
}
