import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private connected = false;

  constructor() {
    super({
      log:
        process.env.PRISMA_QUERY_LOG === "true"
          ? ["query", "info", "warn", "error"]
          : ["warn", "error"],
      transactionOptions: {
        maxWait: Number(process.env.DATABASE_TRANSACTION_MAX_WAIT_MS ?? 5_000),
        timeout: Number(process.env.DATABASE_TRANSACTION_TIMEOUT_MS ?? 15_000),
      },
    });
  }

  async onModuleInit(): Promise<void> {
    const mustConnect =
      (process.env.NODE_ENV ?? "development") === "production" ||
      process.env.DATABASE_CONNECT_ON_START === "true";
    if (mustConnect) await this.ensureConnected();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.connected) {
      await this.$disconnect();
      this.connected = false;
    }
  }

  async ensureConnected(): Promise<void> {
    if (this.connected) return;
    await this.$connect();
    this.connected = true;
  }

  async ping(): Promise<boolean> {
    try {
      await this.ensureConnected();
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}
