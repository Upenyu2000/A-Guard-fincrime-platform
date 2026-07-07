import {
  Injectable,
  OnModuleDestroy,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { createHmac, timingSafeEqual } from "node:crypto";
import Redis from "ioredis";

export interface WebhookVerificationInput {
  integrationId: string;
  rawBody: Buffer;
  signature: string;
  timestamp: string;
  eventId: string;
}

export interface VerifiedWebhook {
  integrationId: string;
  eventId: string;
  timestamp: string;
  signatureChecked: true;
  replayChecked: true;
}

@Injectable()
export class WebhookService implements OnModuleDestroy {
  private readonly redis?: Redis;
  private readonly localReplayCache = new Map<string, number>();

  constructor() {
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      this.redis = new Redis(redisUrl, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        connectTimeout: Number(process.env.REDIS_CONNECT_TIMEOUT_MS ?? 3000),
      });
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.redis) await this.redis.quit().catch(() => undefined);
  }

  async verify(input: WebhookVerificationInput): Promise<VerifiedWebhook> {
    if (!input.rawBody.length) {
      throw new UnauthorizedException("Webhook raw body is required for signature verification.");
    }
    if (!input.signature || !input.timestamp || !input.eventId) {
      throw new UnauthorizedException(
        "Webhook signature, timestamp, and event ID headers are required.",
      );
    }

    const parsedTimestamp = Number(input.timestamp);
    if (!Number.isFinite(parsedTimestamp)) {
      throw new UnauthorizedException("Webhook timestamp is invalid.");
    }
    const clockSkewSeconds = Number(process.env.WEBHOOK_CLOCK_SKEW_SECONDS ?? 300);
    const timestampMilliseconds = parsedTimestamp > 10_000_000_000
      ? parsedTimestamp
      : parsedTimestamp * 1000;
    if (Math.abs(Date.now() - timestampMilliseconds) > clockSkewSeconds * 1000) {
      throw new UnauthorizedException("Webhook timestamp is outside the accepted tolerance.");
    }

    const secret = this.secretFor(input.integrationId);
    const signedPayload = Buffer.concat([
      Buffer.from(`${input.timestamp}.${input.eventId}.`, "utf8"),
      input.rawBody,
    ]);
    const expected = createHmac("sha256", secret).update(signedPayload).digest("hex");
    const supplied = input.signature.replace(/^sha256=/u, "").toLowerCase();
    if (!this.constantTimeHexEqual(expected, supplied)) {
      throw new UnauthorizedException("Webhook signature verification failed.");
    }

    await this.assertNotReplay(input.integrationId, input.eventId, clockSkewSeconds * 2);
    return {
      integrationId: input.integrationId,
      eventId: input.eventId,
      timestamp: input.timestamp,
      signatureChecked: true,
      replayChecked: true,
    };
  }

  private secretFor(integrationId: string): string {
    const integrationKey = `WEBHOOK_SIGNING_SECRET_${integrationId
      .replace(/[^a-zA-Z0-9]/gu, "_")
      .toUpperCase()}`;
    const secret = process.env[integrationKey] ?? process.env.WEBHOOK_SIGNING_SECRET;
    if (!secret || secret.length < 32) {
      throw new ServiceUnavailableException(
        `No sufficiently strong webhook signing secret is configured for ${integrationId}.`,
      );
    }
    return secret;
  }

  private async assertNotReplay(
    integrationId: string,
    eventId: string,
    ttlSeconds: number,
  ): Promise<void> {
    const key = `african-guard:webhook-replay:${integrationId}:${eventId}`;
    if (this.redis) {
      try {
        if (this.redis.status === "wait") await this.redis.connect();
        const result = await this.redis.set(key, "1", "EX", ttlSeconds, "NX");
        if (result !== "OK") throw new UnauthorizedException("Webhook event has already been processed.");
        return;
      } catch (error) {
        if (error instanceof UnauthorizedException) throw error;
        if ((process.env.NODE_ENV ?? "development") === "production") {
          throw new ServiceUnavailableException(
            "Replay protection is unavailable; webhook processing is failing closed.",
          );
        }
      }
    } else if ((process.env.NODE_ENV ?? "development") === "production") {
      throw new ServiceUnavailableException(
        "REDIS_URL is required for production webhook replay protection.",
      );
    }

    const now = Date.now();
    for (const [cachedKey, expiresAt] of this.localReplayCache) {
      if (expiresAt <= now) this.localReplayCache.delete(cachedKey);
    }
    if (this.localReplayCache.has(key)) {
      throw new UnauthorizedException("Webhook event has already been processed.");
    }
    this.localReplayCache.set(key, now + ttlSeconds * 1000);
  }

  private constantTimeHexEqual(expected: string, supplied: string): boolean {
    if (!/^[a-f0-9]{64}$/u.test(supplied)) return false;
    const expectedBuffer = Buffer.from(expected, "hex");
    const suppliedBuffer = Buffer.from(supplied, "hex");
    return expectedBuffer.length === suppliedBuffer.length && timingSafeEqual(expectedBuffer, suppliedBuffer);
  }
}
