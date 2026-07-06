import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AppController } from "./app.controller";
import { DataStoreService } from "./data-store.service";
import { FraudEngineService } from "./modules/fraud/fraud-engine.service";
import { RealtimeGateway } from "./modules/realtime/realtime.gateway";
import { RbacGuard } from "./modules/security/rbac.guard";
import { SecurityService } from "./modules/security/security.service";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 240,
      },
    ]),
  ],
  controllers: [AppController],
  providers: [
    DataStoreService,
    FraudEngineService,
    RealtimeGateway,
    SecurityService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RbacGuard,
    },
  ],
})
export class AppModule {}
