import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from "@nestjs/websockets";
import { OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { Server, Socket } from "socket.io";
import { DataStoreService } from "../../data-store.service";
import { FraudEventInput, UserRole } from "../../domain";
import { FraudEngineService } from "../fraud/fraud-engine.service";
import { AuthenticatedPrincipal } from "../security/auth.types";
import { TokenVerifierService } from "../security/token-verifier.service";

const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

interface AuthenticatedSocketData {
  principal?: AuthenticatedPrincipal;
}

@WebSocketGateway({
  cors: {
    origin: allowedOrigins.length > 0 ? allowedOrigins : false,
    credentials: true,
  },
  maxHttpBufferSize: 256 * 1024,
  pingInterval: 25_000,
  pingTimeout: 20_000,
})
export class RealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit, OnModuleDestroy
{
  @WebSocketServer()
  server!: Server;

  private timer?: NodeJS.Timeout;

  constructor(
    private readonly dataStore: DataStoreService,
    private readonly fraudEngine: FraudEngineService,
    private readonly tokenVerifier: TokenVerifierService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token = this.accessToken(client);
      const principal = await this.tokenVerifier.verifyAccessToken(token);
      (client.data as AuthenticatedSocketData).principal = principal;
      await client.join(this.tenantRoom(principal.tenantId));

      client.emit("connection.ready", {
        tenantId: principal.tenantId,
        subject: principal.subject,
        roles: principal.roles,
      });

      if (this.demoModeEnabled()) {
        client.emit("operating.picture", this.dataStore.operatingPicture());
      }
    } catch (error) {
      client.emit("connection.error", {
        code: "AUTHENTICATION_FAILED",
        message: error instanceof Error ? error.message : "WebSocket authentication failed.",
      });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket): void {
    delete (client.data as AuthenticatedSocketData).principal;
  }

  onModuleInit(): void {
    if (!this.demoModeEnabled()) return;

    this.timer = setInterval(() => {
      const event = this.dataStore.generateSyntheticEvent();
      const decision = this.fraudEngine.scoreEvent(event);
      const persistence = this.dataStore.ingestEvent(event, decision);
      const room = this.tenantRoom(process.env.DEV_TENANT_ID ?? "tenant-demo");

      this.server.to(room).emit("fraud.event.scored", {
        event,
        decision,
        alert: persistence.alert,
      });
      if (persistence.alert) this.server.to(room).emit("fraud.alert", persistence.alert);
      this.server.to(room).emit("operating.picture", this.dataStore.operatingPicture());
    }, Number(process.env.DEMO_EVENT_INTERVAL_MS ?? 4500));
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  @SubscribeMessage("score.event")
  scoreEvent(@MessageBody() event: FraudEventInput, @ConnectedSocket() client: Socket) {
    const principal = (client.data as AuthenticatedSocketData).principal;
    if (!principal) throw new WsException("WebSocket client is not authenticated.");
    this.requireRole(principal, ["analyst", "fraud_investigator", "admin", "institution_partner"]);

    if ((process.env.NODE_ENV ?? "development") === "production") {
      throw new WsException(
        "Interactive WebSocket scoring is disabled until tenant-scoped durable repositories are active.",
      );
    }
    if (!event?.event_type || !event.user_id || !event.institution_id) {
      throw new WsException("event_type, user_id, and institution_id are required.");
    }

    const decision = this.fraudEngine.scoreEvent(event);
    const persistence = this.dataStore.ingestEvent(event, decision);
    const payload = { event, decision, alert: persistence.alert };
    const room = this.tenantRoom(principal.tenantId);

    client.emit("fraud.event.scored", payload);
    this.server.to(room).emit("operating.picture", this.dataStore.operatingPicture());
    return payload;
  }

  private accessToken(client: Socket): string {
    const authToken = client.handshake.auth?.token;
    if (typeof authToken === "string" && authToken.trim()) return authToken.trim();

    const authorization = client.handshake.headers.authorization;
    const raw = Array.isArray(authorization) ? authorization[0] : authorization;
    if (typeof raw === "string" && raw.startsWith("Bearer ")) {
      return raw.slice("Bearer ".length).trim();
    }
    throw new WsException("A bearer token is required in handshake auth.token or Authorization.");
  }

  private requireRole(principal: AuthenticatedPrincipal, roles: UserRole[]): void {
    if (!roles.some((role) => principal.roles.includes(role))) {
      throw new WsException("The authenticated principal cannot perform this WebSocket action.");
    }
  }

  private tenantRoom(tenantId: string): string {
    return `tenant:${tenantId}`;
  }

  private demoModeEnabled(): boolean {
    return (
      (process.env.NODE_ENV ?? "development") !== "production" &&
      process.env.DEMO_MODE === "true"
    );
  }
}
