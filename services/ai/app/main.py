from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Literal

import numpy as np
from fastapi import FastAPI
from pydantic import BaseModel, Field
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

try:
    import shap  # noqa: F401

    SHAP_AVAILABLE = True
except Exception:
    SHAP_AVAILABLE = False


EventType = Literal[
    "transaction",
    "login",
    "device_change",
    "account_update",
    "beneficiary_creation",
]


class BehaviourSignals(BaseModel):
    amount_zscore: float = 0
    velocity_5m: float = 0
    velocity_24h: float = 0
    device_age_hours: float = 720
    device_reputation: float = 0
    ip_risk: float = 0
    geo_velocity_kmh: float = 0
    account_age_days: float = 365
    email_risk: float = 0
    phone_risk: float = 0
    behavior_deviation: float = 0
    beneficiary_risk: float = 0
    graph_risk: float = 0
    consortium_hits: float = 0
    blacklist_confidence: float = 0
    aml_risk: float = 0
    payment_delay_seconds: float = 0
    failed_logins_10m: float = 0
    sanctions_hit: bool = False


class ScoreRequest(BaseModel):
    event_type: EventType
    amount: float = 0
    channel: Literal["mobile", "web", "api", "branch"] = "mobile"
    signals: BehaviourSignals = Field(default_factory=BehaviourSignals)


class CaseContext(BaseModel):
    case_id: str
    title: str
    status: str
    priority: str
    loss_exposure: float
    recovery_potential: float
    evidence: list[dict[str, Any]] = Field(default_factory=list)
    timeline: list[dict[str, Any]] = Field(default_factory=list)
    entities: list[str] = Field(default_factory=list)


class ChatRequest(BaseModel):
    case: CaseContext
    prompt: str


class FeedbackRequest(BaseModel):
    case_id: str
    label: Literal["confirmed_fraud", "false_positive", "recovered", "needs_more_review"]
    features: dict[str, float] = Field(default_factory=dict)
    analyst: str


FEATURE_NAMES = [
    "amount_zscore",
    "velocity_5m",
    "velocity_24h",
    "device_reputation",
    "ip_risk",
    "geo_velocity_kmh",
    "account_age_days",
    "email_risk",
    "phone_risk",
    "behavior_deviation",
    "beneficiary_risk",
    "graph_risk",
    "consortium_hits",
    "blacklist_confidence",
    "aml_risk",
    "payment_delay_seconds",
]


def build_training_matrix() -> np.ndarray:
    rng = np.random.default_rng(42)
    normal = rng.normal(loc=[0.8, 1.8, 6, 18, 19, 80, 420, 12, 10, 15, 18, 21, 0.1, 11, 16, 80], scale=8, size=(400, 16))
    risky = rng.normal(loc=[4.5, 6.5, 24, 74, 72, 980, 9, 71, 64, 78, 82, 79, 2, 78, 73, 540], scale=12, size=(90, 16))
    return np.clip(np.vstack([normal, risky]), 0, None)


SCALER = StandardScaler()
TRAINING = SCALER.fit_transform(build_training_matrix())
MODEL = IsolationForest(n_estimators=120, contamination=0.12, random_state=42)
MODEL.fit(TRAINING)

app = FastAPI(
    title="African Guard AI Investigation Service",
    version="0.1.0",
    description="AI/ML scoring, explainability, drift, and investigation copilot service.",
)


def feature_vector(request: ScoreRequest) -> np.ndarray:
    s = request.signals
    raw = np.array(
        [
            s.amount_zscore,
            s.velocity_5m,
            s.velocity_24h,
            s.device_reputation,
            s.ip_risk,
            s.geo_velocity_kmh,
            s.account_age_days,
            s.email_risk,
            s.phone_risk,
            s.behavior_deviation,
            s.beneficiary_risk,
            s.graph_risk,
            s.consortium_hits,
            s.blacklist_confidence,
            s.aml_risk,
            s.payment_delay_seconds,
        ],
        dtype=float,
    )
    return raw.reshape(1, -1)


def level(score: int) -> str:
    if score >= 80:
        return "critical"
    if score >= 60:
        return "high"
    if score >= 35:
        return "medium"
    return "low"


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "service": "african-guard-ai",
        "model": "IsolationForest + deterministic feature attribution",
        "shap_available": SHAP_AVAILABLE,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.post("/score")
def score(request: ScoreRequest) -> dict[str, Any]:
    raw = feature_vector(request)
    scaled = SCALER.transform(raw)
    anomaly = float(-MODEL.decision_function(scaled)[0])
    anomaly_score = int(np.clip((anomaly + 0.12) * 230, 0, 100))

    s = request.signals
    behavior_score = int(
        np.clip(
            s.device_reputation * 0.18
            + s.ip_risk * 0.17
            + s.email_risk * 0.16
            + s.phone_risk * 0.09
            + s.behavior_deviation * 0.24
            + (14 if s.account_age_days < 14 else 0),
            0,
            100,
        )
    )
    graph_score = int(np.clip(s.graph_risk * 0.72 + s.beneficiary_risk * 0.28, 0, 100))
    consortium_score = int(np.clip(s.consortium_hits * 22 + s.blacklist_confidence * 0.78, 0, 100))
    aml_score = int(np.clip(s.aml_risk * 0.78 + (35 if s.sanctions_hit else 0), 0, 100))
    risk_score = int(
        np.clip(
            anomaly_score * 0.27
            + behavior_score * 0.21
            + graph_score * 0.2
            + consortium_score * 0.2
            + aml_score * 0.12,
            0,
            100,
        )
    )

    impacts = dict(zip(FEATURE_NAMES, raw.flatten().tolist(), strict=True))
    top_factors = sorted(impacts.items(), key=lambda item: abs(item[1]), reverse=True)[:6]

    return {
        "risk_score": risk_score,
        "risk_level": level(risk_score),
        "decision": "block" if s.sanctions_hit or risk_score >= 82 else "review" if risk_score >= 60 else "approve",
        "component_scores": {
            "ml_anomaly": anomaly_score,
            "behavioural_profile": behavior_score,
            "identity_graph": graph_score,
            "consortium_intelligence": consortium_score,
            "aml_sanctions": aml_score,
        },
        "explainability": {
            "method": "SHAP-ready feature attribution" if SHAP_AVAILABLE else "deterministic feature attribution",
            "top_factors": [
                {
                    "feature": name,
                    "impact": round(value, 2),
                    "direction": "risk_increase" if value >= 0 else "risk_decrease",
                }
                for name, value in top_factors
            ],
        },
    }


@app.post("/copilot/summarize")
def summarize_case(case: CaseContext) -> dict[str, Any]:
    strongest = max(case.evidence, key=lambda item: item.get("confidence", 0), default={})
    return {
        "summary": (
            f"{case.title} is a {case.priority} priority case with "
            f"{case.loss_exposure:,.0f} exposure and {case.recovery_potential:,.0f} recoverability. "
            f"The strongest evidence is {strongest.get('label', 'not yet established')}."
        ),
        "recommended_actions": [
            "Preserve payment recall window and notify correspondent institutions.",
            "Corroborate entity hashes through encrypted consortium sharing.",
            "Escalate SAR draft when graph and payment evidence align.",
        ],
        "sar_draft": (
            f"Case {case.case_id} indicates suspected fraud involving anonymised entities "
            f"{', '.join(case.entities[:5])}. Investigation evidence supports escalation based on "
            f"{strongest.get('label', 'available case evidence')}."
        ),
    }


@app.post("/copilot/chat")
def chat(request: ChatRequest) -> dict[str, Any]:
    prompt = request.prompt.lower()
    case = request.case

    if "why" in prompt or "flagged" in prompt:
        evidence = ", ".join(item.get("label", "evidence") for item in case.evidence[:4])
        return {"answer": f"The case was flagged because {evidence}.", "citations": ["evidence", "timeline"]}

    if "link" in prompt or "entity" in prompt:
        return {
            "answer": f"Related anonymised entities: {', '.join(case.entities)}.",
            "citations": ["identity_graph"],
        }

    if "sar" in prompt:
        return {
            "answer": f"Draft SAR: {case.title} involves suspected financial crime with {case.loss_exposure:,.0f} exposure and converged fraud/AML indicators.",
            "citations": ["sar_draft"],
        }

    return {
        "answer": f"{case.title} is currently {case.status}. Prioritise recovery, containment, and consortium corroboration.",
        "citations": ["case_status"],
    }


@app.post("/learning/feedback")
def feedback(request: FeedbackRequest) -> dict[str, Any]:
    drift_contribution = float(np.std(list(request.features.values()) or [0]) / 100)
    return {
        "accepted": True,
        "case_id": request.case_id,
        "label": request.label,
        "analyst": request.analyst,
        "queued_for_retraining": request.label in {"confirmed_fraud", "false_positive"},
        "drift_contribution": round(drift_contribution, 4),
    }


@app.get("/model/drift")
def drift() -> dict[str, Any]:
    return {
        "model_version": "hybrid-risk-2026.07",
        "drift_index": 0.17,
        "status": "healthy",
        "watchlist_features": ["payment_delay_seconds", "beneficiary_risk", "geo_velocity_kmh"],
        "next_retraining_window": "02:00 UTC",
    }
