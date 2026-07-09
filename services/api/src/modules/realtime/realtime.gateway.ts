import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { Server, Socket } from "socket.io";
import { DataStoreService } from "../../data-store.service";
import { eventTypes, FraudEventInput, RiskDecision, UserRole } from "../../domain";
import { AmlService } from "../aml/aml.service";
import { FraudEngineService } from "../fraud/fraud-engine.service";

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

const allowedOrigins = () =>
  (process.env.ALLOWED_ORIGINS ?? "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const isOriginAllowed = (origin?: string) => !origin || allowedOrigins().includes(origin);

interface RealtimeUser {
  actor: string;
  role: UserRole;
  institutionId?: string;
  tenantId?: string;
}

type AuthenticatedSocket = Socket & {
  data: {
    user?: RealtimeUser;
  };
};

@WebSocketGateway({
  cors: {
    origin(origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) {
      callback(isOriginAllowed(origin) ? null : new Error("Origin is not allowed."), isOriginAllowed(origin));
    },
    credentials: true,
  },
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit, OnModuleDestroy {
  @WebSocketServer()
  server!: Server;

  private timer?: NodeJS.Timeout;
  private readonly scoreLimits = new Map<string, { windowStartedAt: number; count: number }>();

  constructor(
    private readonly dataStore: DataStoreService,
    private readonly fraudEngine: FraudEngineService,
    private readonly amlService: AmlService,
  ) {}

  handleConnection(client: AuthenticatedSocket) {
    const user = this.authenticate(client);
    if (!user) {
      client.emit("risk.error", this.safeRealtimeError("AUTHENTICATION_REQUIRED", "Authentication is required."));
      client.disconnect(true);
      return;
    }

    client.data.user = user;
    client.join(this.roomFor(user));
    client.emit("operating.picture", this.dataStore.operatingPicture());
  }

  handleDisconnect(client: AuthenticatedSocket) {
    this.scoreLimits.delete(client.id);
  }

  onModuleInit() {
    this.timer = setInterval(() => {
      const event = this.dataStore.generateSyntheticEvent();
      const decision = this.fraudEngine.scoreEvent(event);
      const persistence = this.dataStore.ingestEvent(event, decision);

      this.server.emit("fraud.event.scored", this.sanitizeFraudPayload(event, decision, persistence.alert));

      if (persistence.alert) {
        this.server.emit("fraud.alert", persistence.alert);
      }

      const aml = this.amlService.sanitizeRealtimeEvent(this.amlService.evaluateSyntheticStreamEvent());
      this.server.emit("aml.transaction.evaluated", aml.transaction);
      if (aml.alert) this.server.emit("aml.alert.created", aml.alert);
      for (const cluster of aml.clusters) {
        this.server.emit("aml.microtransaction.cluster.detected", cluster);
      }
      if (aml.customer) this.server.emit("aml.customer.risk.changed", aml.customer);
      if (aml.business) this.server.emit("aml.business.risk.changed", aml.business);
      if (aml.screening) this.server.emit("aml.screening.match.created", aml.screening);
      if (aml.case) this.server.emit("aml.case.escalated", aml.case);
      if (aml.sar) this.server.emit("aml.sar.ready_for_review", aml.sar);
      this.server.emit("aml.overview", aml.overview);
      this.server.emit("operating.picture", this.dataStore.operatingPicture());
    }, 4500);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  @SubscribeMessage("score.event")
  scoreEvent(@MessageBody() event: FraudEventInput, @ConnectedSocket() client: AuthenticatedSocket) {
    if (!client.data.user) {
      const error = this.safeRealtimeError("AUTHENTICATION_REQUIRED", "Authentication is required.");
      client.emit("risk.error", error);
      return error;
    }

    if (!this.allowScoreEvent(client)) {
      const error = this.safeRealtimeError("RATE_LIMITED", "Too many realtime scoring requests.");
      client.emit("risk.error", error);
      return error;
    }

    const validationError = this.validateFraudEvent(event);
    if (validationError) {
      const error = this.safeRealtimeError("VALIDATION_ERROR", validationError);
      client.emit("risk.error", error);
      return error;
    }

    const decision = this.fraudEngine.scoreEvent(event);
    const persistence = this.dataStore.ingestEvent(event, decision);
    const payload = this.sanitizeFraudPayload(event, decision, persistence.alert);

    client.emit("fraud.event.scored", payload);
    this.server.emit("operating.picture", this.dataStore.operatingPicture());
    return payload;
  }

  private authenticate(client: Socket): RealtimeUser | null {
    const rawToken = client.handshake.auth?.token;
    const authorization =
      typeof rawToken === "string" && rawToken.length > 0
        ? `bearer ${rawToken}`
        : this.header(client.handshake.headers, "authorization");

    if (authorization?.toLowerCase().startsWith("bearer ")) {
      return this.verifyBearer(authorization.slice("bearer ".length).trim());
    }

    const sessionToken = this.cookie(client.handshake.headers, "ag_session");
    if (sessionToken) {
      return this.verifyBearer(sessionToken);
    }

    if (process.env.NODE_ENV !== "production" && process.env.ALLOW_DEV_HEADER_AUTH !== "false") {
      const role = this.normalizedRole(this.header(client.handshake.headers, "x-role") ?? process.env.DEV_AUTH_ROLE ?? "admin");
      if (!role) return null;
      const actor = this.header(client.handshake.headers, "x-actor") ?? process.env.DEV_AUTH_ACTOR ?? "local-realtime-user";
      return { actor, role, institutionId: "local-institution", tenantId: "local-tenant" };
    }

    return null;
  }

  private verifyBearer(token: string): RealtimeUser | null {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.includes("<") || secret.length < 24) return null;
    const [encodedHeader, encodedPayload, encodedSignature] = token.split(".");
    if (!encodedHeader || !encodedPayload || !encodedSignature) return null;

    const expected = this.base64Url(createHmac("sha256", secret).update(`${encodedHeader}.${encodedPayload}`).digest());
    const expectedBuffer = Buffer.from(expected);
    const actualBuffer = Buffer.from(encodedSignature);
    if (expectedBuffer.length !== actualBuffer.length || !timingSafeEqual(expectedBuffer, actualBuffer)) return null;

    try {
      const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as {
        sub?: string;
        role?: string;
        institutionId?: string;
        tenantId?: string;
        exp?: number;
      };
      if (!payload.sub || !payload.role) return null;
      if (payload.exp && payload.exp * 1000 < Date.now()) return null;
      const role = this.normalizedRole(payload.role);
      if (!role) return null;
      return {
        actor: payload.sub,
        role,
        institutionId: payload.institutionId,
        tenantId: payload.tenantId,
      };
    } catch {
      return null;
    }
  }

  private allowScoreEvent(client: Socket) {
    const now = Date.now();
    const current = this.scoreLimits.get(client.id);
    if (!current || now - current.windowStartedAt > 60_000) {
      this.scoreLimits.set(client.id, { windowStartedAt: now, count: 1 });
      return true;
    }
    current.count += 1;
    return current.count <= 30;
  }

  private validateFraudEvent(event: FraudEventInput) {
    if (!event || !eventTypes.includes(event.event_type)) return "The realtime event type is invalid.";
    if (!event.user_id || !event.institution_id) return "The realtime event is missing required identifiers.";
    if (event.amount !== undefined && (!Number.isFinite(event.amount) || event.amount < 0)) return "The realtime amount is invalid.";
    if (event.metadata && JSON.stringify(event.metadata).length > 2048) return "The realtime metadata payload is too large.";
    return null;
  }

  private sanitizeFraudPayload(event: FraudEventInput, decision: RiskDecision, alert: unknown) {
    return {
      event: {
        event_id: event.event_id,
        event_type: event.event_type,
        institution_id: event.institution_id,
        subject_ref: this.reference("usr", event.user_id),
        amount: event.amount ?? 0,
        currency: event.currency ?? "USD",
        country: event.country,
        channel: event.channel,
      },
      decision: {
        ...decision,
        reasons: decision.reasons.map((reason) => reason.replace(/ML/gi, "behavioural")),
        explainability: {
          ...decision.explainability,
          model_version: "AG-RISK-2026.1",
          policy_version: "AG-POLICY-FRAUD-1.0",
        },
      },
      alert,
    };
  }

  private safeRealtimeError(code: string, message: string) {
    return { code, message, correlationId: `ag-${randomUUID().slice(0, 12)}` };
  }

  private roomFor(user: RealtimeUser) {
    return `tenant:${user.tenantId ?? user.institutionId ?? "default"}`;
  }

  private reference(prefix: string, value: string) {
    const secret = process.env.CONSORTIUM_SHARED_SECRET ?? "local-development-placeholder";
    return `${prefix}_${createHmac("sha256", secret).update(value).digest("hex").slice(0, 12)}`;
  }

  private normalizedRole(value: string): UserRole | null {
    const role = value.toLowerCase() as UserRole;
    if (!allowedRoles.has(role)) return null;
    return role;
  }

  private base64Url(value: Buffer) {
    return value.toString("base64").replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
  }

  private header(headers: Record<string, string | string[] | undefined>, name: string) {
    const value = headers[name] ?? headers[name.toLowerCase()];
    return Array.isArray(value) ? value[0] : value;
  }

  private cookie(headers: Record<string, string | string[] | undefined>, name: string) {
    return this.header(headers, "cookie")
      ?.split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${name}=`))
      ?.slice(name.length + 1);
  }
}
