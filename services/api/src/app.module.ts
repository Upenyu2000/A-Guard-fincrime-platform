import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AppController } from "./app.controller";
import { DataStoreService } from "./data-store.service";
import { FraudEngineService } from "./modules/fraud/fraud-engine.service";
import { RealtimeGateway } from "./modules/realtime/realtime.gateway";
import { IntegrationsService } from "./modules/integrations-service/integrations-service.service";
import { TransactionIngestionService } from "./modules/transaction-ingestion-service/transaction-ingestion-service.service";
import { RiskScoringService } from "./modules/risk-scoring-service/risk-scoring-service.service";
import { CaseManagementService } from "./modules/case-management-service/case-management-service.service";
import { OsintSearchService } from "./modules/osint-search-service/osint-search-service.service";
import { EvidenceService } from "./modules/evidence-service/evidence-service.service";
import { WebhookService } from "./modules/webhook-service/webhook-service.service";
import { UserAccessService } from "./modules/user-access-service/user-access-service.service";
import { LiveModule } from "./modules/live/live.module";
import { JwtAuthGuard } from "./modules/security/jwt-auth.guard";
import { PersistentTenantGuard } from "./modules/security/persistent-tenant.guard";
import { ProductionSafetyGuard } from "./modules/security/production-safety.guard";
import { RbacGuard } from "./modules/security/rbac.guard";
import { ScopeGuard } from "./modules/security/scope.guard";
import { SecurityService } from "./modules/security/security.service";
import { TenantContextGuard } from "./modules/security/tenant-context.guard";
import { TokenVerifierService } from "./modules/security/token-verifier.service";
import { WebhookVerificationGuard } from "./modules/security/webhook-verification.guard";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 240 }]),
    LiveModule,
  ],
  controllers: [AppController],
  providers: [
    DataStoreService,
    FraudEngineService,
    RealtimeGateway,
    SecurityService,
    TokenVerifierService,
    IntegrationsService,
    TransactionIngestionService,
    RiskScoringService,
    CaseManagementService,
    OsintSearchService,
    EvidenceService,
    WebhookService,
    UserAccessService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: WebhookVerificationGuard },
    { provide: APP_GUARD, useClass: TenantContextGuard },
    { provide: APP_GUARD, useClass: ProductionSafetyGuard },
    { provide: APP_GUARD, useClass: PersistentTenantGuard },
    { provide: APP_GUARD, useClass: RbacGuard },
    { provide: APP_GUARD, useClass: ScopeGuard },
  ],
})
export class AppModule {}
