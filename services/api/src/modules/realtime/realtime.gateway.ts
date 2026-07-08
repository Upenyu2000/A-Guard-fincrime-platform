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
import { AmlService } from "../aml/aml.service";
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
    private readonly amlService: AmlService,
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

      const aml = this.amlService.evaluateSyntheticStreamEvent();
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
