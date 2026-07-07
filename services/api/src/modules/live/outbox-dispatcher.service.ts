import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { OutboxStatus, Prisma } from "@prisma/client";
import { Kafka, Producer } from "kafkajs";
import { PrismaService } from "../database/prisma.service";

@Injectable()
export class OutboxDispatcherService implements OnModuleInit, OnModuleDestroy {
  private producer?: Producer;
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    if (process.env.OUTBOX_DISPATCH_ENABLED !== "true") return;
    await this.connect();
    this.timer = setInterval(
      () => void this.dispatchBatch(),
      Number(process.env.OUTBOX_POLL_INTERVAL_MS ?? 1_000),
    );
  }

  async onModuleDestroy(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    if (this.producer) await this.producer.disconnect().catch(() => undefined);
  }

  async dispatchBatch(): Promise<{ published: number; failed: number }> {
    if (this.running) return { published: 0, failed: 0 };
    this.running = true;
    try {
      await this.prisma.ensureConnected();
      await this.connect();
      const events = await this.prisma.outboxEvent.findMany({
        where: {
          status: OutboxStatus.PENDING,
          availableAt: { lte: new Date() },
        },
        orderBy: { createdAt: "asc" },
        take: Number(process.env.OUTBOX_BATCH_SIZE ?? 100),
      });

      let published = 0;
      let failed = 0;
      for (const event of events) {
        try {
          await this.producer!.send({
            topic: event.topic,
            acks: -1,
            messages: [
              {
                key: event.eventKey,
                value: JSON.stringify(event.payload),
                headers: {
                  "event-id": event.id,
                  "event-type": event.eventType,
                  "schema-version": event.schemaVersion,
                  "tenant-id": event.tenantId,
                  ...this.headers(event.headers),
                },
              },
            ],
          });
          await this.prisma.outboxEvent.update({
            where: { id: event.id },
            data: {
              status: OutboxStatus.PUBLISHED,
              publishedAt: new Date(),
              attempts: { increment: 1 },
              lastError: null,
            },
          });
          published += 1;
        } catch (error) {
          const attempts = event.attempts + 1;
          await this.prisma.outboxEvent.update({
            where: { id: event.id },
            data: {
              status:
                attempts >= Number(process.env.OUTBOX_MAX_ATTEMPTS ?? 10)
                  ? OutboxStatus.FAILED
                  : OutboxStatus.PENDING,
              attempts,
              availableAt: new Date(Date.now() + this.backoff(attempts)),
              lastError: (error instanceof Error ? error.message : "Kafka publication failed").slice(
                0,
                2_000,
              ),
            },
          });
          failed += 1;
        }
      }
      return { published, failed };
    } finally {
      this.running = false;
    }
  }

  private async connect(): Promise<void> {
    if (this.producer) return;
    const brokers = (process.env.KAFKA_BROKERS ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    if (brokers.length === 0) throw new Error("KAFKA_BROKERS is required for outbox dispatch.");
    this.producer = new Kafka({
      clientId: "african-guard-outbox",
      brokers,
      connectionTimeout: 5_000,
      requestTimeout: 10_000,
      retry: { retries: 5 },
    }).producer({ idempotent: true, maxInFlightRequests: 1 });
    await this.producer.connect();
  }

  private headers(value: Prisma.JsonValue): Record<string, string> {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.fromEntries(
      Object.entries(value)
        .filter((entry): entry is [string, string | number | boolean] =>
          ["string", "number", "boolean"].includes(typeof entry[1]),
        )
        .map(([key, item]) => [key, String(item)]),
    );
  }

  private backoff(attempt: number): number {
    const maximum = Number(process.env.OUTBOX_MAX_BACKOFF_MS ?? 300_000);
    const base = Number(process.env.OUTBOX_BASE_BACKOFF_MS ?? 1_000);
    return Math.min(maximum, base * 2 ** Math.min(attempt, 10)) + Math.floor(Math.random() * 500);
  }
}
