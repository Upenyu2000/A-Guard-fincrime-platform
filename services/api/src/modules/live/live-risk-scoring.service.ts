import { Injectable, ServiceUnavailableException } from "@nestjs/common";

export interface LiveRiskResult {
  score: number;
  level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  recommendation: "APPROVE" | "REVIEW" | "BLOCK";
  componentScores: Record<string, number>;
  reasons: string[];
  explainability: Record<string, unknown>;
  modelVersion: string;
  featureVersion: string;
  policyVersion: string;
  degraded: boolean;
}

@Injectable()
export class LiveRiskScoringService {
  async score(input: {
    amount: string;
    eventType: string;
    signals?: Record<string, unknown>;
  }): Promise<LiveRiskResult> {
    const baseUrl = process.env.AI_SERVICE_URL;
    if (!baseUrl) return this.degraded("AI service is not configured.");

    try {
      const response = await fetch(`${baseUrl.replace(/\/$/u, "")}/score`, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          event_type: input.eventType,
          amount: Number(input.amount),
          channel: "api",
          signals: this.numericSignals(input.signals),
        }),
        signal: AbortSignal.timeout(Number(process.env.AI_SCORING_TIMEOUT_MS ?? 1_000)),
      });
      if (!response.ok) throw new Error(`AI service returned ${response.status}.`);
      return this.parse(await response.json());
    } catch (error) {
      if (process.env.FAIL_SCORING_CLOSED === "true") {
        throw new ServiceUnavailableException("Risk scoring is unavailable.");
      }
      return this.degraded(error instanceof Error ? error.message : "Risk scoring failed.");
    }
  }

  async health(): Promise<boolean> {
    const baseUrl = process.env.AI_SERVICE_URL;
    if (!baseUrl) return false;
    try {
      const response = await fetch(`${baseUrl.replace(/\/$/u, "")}/health`, {
        signal: AbortSignal.timeout(Number(process.env.AI_HEALTH_TIMEOUT_MS ?? 1_500)),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private parse(value: unknown): LiveRiskResult {
    const payload = this.record(value);
    const score = Number(payload.risk_score);
    const level = String(payload.risk_level ?? "").toUpperCase();
    const recommendation = String(payload.decision ?? "").toUpperCase();
    if (!Number.isFinite(score) || score < 0 || score > 100) throw new Error("Invalid score.");
    if (!["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(level)) throw new Error("Invalid level.");
    if (!["APPROVE", "REVIEW", "BLOCK"].includes(recommendation)) throw new Error("Invalid decision.");

    const explainability = this.record(payload.explainability);
    const componentScores = Object.fromEntries(
      Object.entries(this.record(payload.component_scores))
        .map(([key, item]) => [key, Number(item)] as const)
        .filter(([, item]) => Number.isFinite(item)),
    );
    const reasons = Array.isArray(explainability.top_factors)
      ? explainability.top_factors
          .map((item) => this.record(item).feature)
          .filter((item): item is string => typeof item === "string")
      : [];

    return {
      score: Math.round(score),
      level: level as LiveRiskResult["level"],
      recommendation: recommendation as LiveRiskResult["recommendation"],
      componentScores,
      reasons,
      explainability,
      modelVersion:
        typeof explainability.model_version === "string"
          ? explainability.model_version
          : "unversioned-model",
      featureVersion: process.env.FEATURE_SCHEMA_VERSION ?? "fraud-signals-1.0",
      policyVersion: process.env.POLICY_VERSION ?? "review-policy-1.0",
      degraded: false,
    };
  }

  private degraded(message: string): LiveRiskResult {
    return {
      score: 60,
      level: "HIGH",
      recommendation: "REVIEW",
      componentScores: { modelAvailability: 0 },
      reasons: ["risk_model_unavailable", "human_review_required"],
      explainability: { method: "availability_policy", warning: message },
      modelVersion: "unavailable",
      featureVersion: process.env.FEATURE_SCHEMA_VERSION ?? "fraud-signals-1.0",
      policyVersion: process.env.POLICY_VERSION ?? "review-policy-1.0",
      degraded: true,
    };
  }

  private numericSignals(signals?: Record<string, unknown>): Record<string, number | boolean> {
    return Object.fromEntries(
      Object.entries(signals ?? {}).filter(
        (entry): entry is [string, number | boolean] =>
          typeof entry[1] === "number" || typeof entry[1] === "boolean",
      ),
    );
  }

  private record(value: unknown): Record<string, unknown> {
    return value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  }
}
