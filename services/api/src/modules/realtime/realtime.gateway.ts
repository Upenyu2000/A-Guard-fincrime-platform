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
import { Server, Socket } from "socket.io";
import { DataStoreService } from "../../data-store.service";
import { FraudEventInput } from "../../domain";
import { FraudEngineService } from "../fraud/fraud-engine.service";

@WebSocketGateway({
  cors: {
    origin: "*",
  },
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit, OnModuleDestroy {
  @WebSocketServer()
  server!: Server;

  private timer?: NodeJS.Timeout;

  constructor(
    private readonly dataStore: DataStoreService,
    private readonly fraudEngine: FraudEngineService,
  ) {}

  handleConnection(client: Socket) {
    client.emit("operating.picture", this.dataStore.operatingPicture());
  }

  handleDisconnect() {
    return undefined;
  }

  onModuleInit() {
    this.timer = setInterval(() => {
      const event = this.dataStore.generateSyntheticEvent();
      const decision = this.fraudEngine.scoreEvent(event);
      const persistence = this.dataStore.ingestEvent(event, decision);

      this.server.emit("fraud.event.scored", {
        event,
        decision,
        alert: persistence.alert,
      });

      if (persistence.alert) {
        this.server.emit("fraud.alert", persistence.alert);
      }

      this.server.emit("operating.picture", this.dataStore.operatingPicture());
    }, 4500);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  @SubscribeMessage("score.event")
  scoreEvent(@MessageBody() event: FraudEventInput, @ConnectedSocket() client: Socket) {
    const decision = this.fraudEngine.scoreEvent(event);
    const persistence = this.dataStore.ingestEvent(event, decision);
    const payload = {
      event,
      decision,
      alert: persistence.alert,
    };

    client.emit("fraud.event.scored", payload);
    this.server.emit("operating.picture", this.dataStore.operatingPicture());
    return payload;
  }
}
