import { Injectable, OnModuleDestroy } from "@nestjs/common";
import Redis from "ioredis";
import { Kafka } from "kafkajs";
import { PrismaService } from "../database/prisma.service";
import { LiveRiskScoringService } from "./live-risk-scoring.service";

export interface DependencyCheck {
  status: "ready" | "unavailable" | "not_configured";
  required: boolean;
  latencyMs?: number;
  detail?: string;
}

@Injectable()
export class LiveReadinessService implements OnModuleDestroy {
  private redis?: Redis;

  constructor(
    private readonly prisma: PrismaService,
    private readonly riskScoring: LiveRiskScoringService,
  ) {}

  async onModuleDestroy(): Promise<void> {
    if (this.redis) await this.redis.quit().catch(() => undefined);
  }

  liveness() {
    return {
      status: "ok",
      service: "african-guard-api",
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }

  startup() {
    const environment = process.env.NODE_ENV ?? "development";
    const required = [
      "DATABASE_URL",
      "REDIS_URL",
      "KAFKA_BROKERS",
      "AI_SERVICE_URL",
      "OAUTH_ISSUER_URL",
      "OAUTH_AUDIENCE",
      "ENCRYPTION_MASTER_KEY",
      "ENCRYPTION_KEY_REF",
      "API_KEY_PEPPER",
      "CORS_ALLOWED_ORIGINS",
    ];
    const missing = required.filter((name) => !process.env[name]);
    const demoEnabled = [
      process.env.DEMO_MODE,
      process.env.AI_DEMO_MODE,
      process.env.NEXT_PUBLIC_DEMO_MODE,
    ].some((value) => value === "true");
    const blocked = missing.length > 0 || (environment === "production" && demoEnabled);

    return {
      status: blocked ? "blocked" : "ready",
      environment,
      missingConfiguration: missing,
      demoModeEnabled: demoEnabled,
      timestamp: new Date().toISOString(),
    };
  }

  async readiness() {
    const [postgres, redis, kafka, ai] = await Promise.all([
      this.measure(() => this.prisma.ping()),
      this.checkRedis(),
      this.checkKafka(),
      this.measure(() => this.riskScoring.health()),
    ]);
    const dependencies = { postgres, redis, kafka, ai };
    return {
      status: Object.values(dependencies).every((item) => item.status === "ready")
        ? "ready"
        : "unavailable",
      dependencies,
      timestamp: new Date().toISOString(),
    };
  }

  private async checkRedis(): Promise<DependencyCheck> {
    const url = process.env.REDIS_URL;
    if (!url) return { status: "not_configured", required: true };
    if (!this.redis) {
      this.redis = new Redis(url, {
        lazyConnect: true,
        enableOfflineQueue: false,
        maxRetriesPerRequest: 1,
        connectTimeout: 3000,
      });
    }
    return this.measure(async () => {
      if (this.redis?.status === "wait") await this.redis.connect();
      return (await this.redis?.ping()) === "PONG";
    });
  }

  private async checkKafka(): Promise<DependencyCheck> {
    const value = process.env.KAFKA_BROKERS;
    if (!value) return { status: "not_configured", required: true };
    const admin = new Kafka({
      clientId: "african-guard-readiness",
      brokers: value.split(",").map((item) => item.trim()).filter(Boolean),
      connectionTimeout: 3000,
      requestTimeout: 3000,
      retry: { retries: 0 },
    }).admin();
    return this.measure(async () => {
      try {
        await admin.connect();
        await admin.listTopics();
        return true;
      } finally {
        await admin.disconnect().catch(() => undefined);
      }
    });
  }

  private async measure(check: () => Promise<boolean>): Promise<DependencyCheck> {
    const started = performance.now();
    try {
      return {
        status: (await check()) ? "ready" : "unavailable",
        required: true,
        latencyMs: Math.round(performance.now() - started),
      };
    } catch (error) {
      return {
        status: "unavailable",
        required: true,
        latencyMs: Math.round(performance.now() - started),
        detail: error instanceof Error ? error.message : "Dependency check failed.",
      };
    }
  }
}
