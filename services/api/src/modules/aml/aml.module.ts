import { Module } from "@nestjs/common";
import { FraudEngineService } from "../fraud/fraud-engine.service";
import { SecurityService } from "../security/security.service";
import { AmlController } from "./aml.controller";
import { AmlService } from "./aml.service";
import { MicrotransactionDetectorService } from "./microtransaction-detector.service";

@Module({
  controllers: [AmlController],
  providers: [AmlService, MicrotransactionDetectorService, FraudEngineService, SecurityService],
  exports: [AmlService],
})
export class AmlModule {}
