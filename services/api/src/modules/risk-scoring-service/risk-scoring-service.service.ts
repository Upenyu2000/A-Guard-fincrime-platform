import { Injectable } from "@nestjs/common";

@Injectable()
export class RiskScoringService {
  readonly boundary = "risk-scoring-service";
  readonly responsibilities = ["real_time_scoring", "explainability", "model_monitoring", "human_review_routing"];
}
