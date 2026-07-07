from __future__ import annotations

import hashlib
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Literal

import joblib
import numpy as np
from fastapi import FastAPI
from pydantic import BaseModel, Field
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

try:
    import shap

    SHAP_AVAILABLE = True
except Exception:
    shap = None
    SHAP_AVAILABLE = False


EventType = Literal[
    "transaction",
    "login",
    "device_change",
    "account_update",
    "beneficiary_creation",
]


class BehaviourSignals(BaseModel):
    amount_zscore: float = Field(default=0, ge=-20, le=20)
    velocity_5m: float = Field(default=0, ge=0, le=10_000)
    velocity_24h: float = Field(default=0, ge=0, le=1_000_000)
    device_age_hours: float = Field(default=720, ge=0)
    device_reputation: float = Field(default=0, ge=0, le=100)
    device_fingerprint_reuse: float = Field(default=0, ge=0, le=100_000)
    ip_risk: float = Field(default=0, ge=0, le=100)
    geo_velocity_kmh: float = Field(default=0, ge=0, le=100_000)
    account_age_days: float = Field(default=365, ge=0)
    email_risk: float = Field(default=0, ge=0, le=100)
    phone_risk: float = Field(default=0, ge=0, le=100)
    behavior_deviation: float = Field(default=0, ge=0, le=100)
    bot_score: float = Field(default=0, ge=0, le=100)
    remote_access_tool: bool = False
    deepfake_risk: float = Field(default=0, ge=0, le=100)
    session_entropy: float = Field(default=50, ge=0, le=100)
    beneficiary_risk: float = Field(default=0, ge=0, le=100)
    graph_risk: float = Field(default=0, ge=0, le=100)
    consortium_hits: float = Field(default=0, ge=0, le=100_000)
    blacklist_confidence: float = Field(default=0, ge=0, le=100)
    aml_risk: float = Field(default=0, ge=0, le=100)
    payment_delay_seconds: float = Field(default=0, ge=0)
    failed_logins_10m: float = Field(default=0, ge=0, le=100_000)
    sanctions_hit: bool = False


class ScoreRequest(BaseModel):
    event_type: EventType
    amount: float = Field(default=0, ge=0)
    channel: Literal["mobile", "web", "api", "branch"] = "mobile"
    signals: BehaviourSignals = Field(default_factory=BehaviourSignals)


class CaseContext(BaseModel):
    case_id: str = Field(min_length=1, max_length=200)
    title: str = Field(min_length=1, max_length=500)
    status: str = Field(min_length=1, max_length=100)
    priority: str = Field(min_length=1, max_length=100)
    loss_exposure: float = Field(ge=0)
    recovery_potential: float = Field(ge=0)
    evidence: list[dict[str, Any]] = Field(default_factory=list, max_length=500)
    timeline: list[dict[str, Any]] = Field(default_factory=list, max_length=2_000)
    entities: list[str] = Field(default_factory=list, max_length=500)


class ChatRequest(BaseModel):
    case: CaseContext
    prompt: str = Field(min_length=1, max_length=8_000)


class FeedbackRequest(BaseModel):
    case_id: str = Field(min_length=1, max_length=200)
    label: Literal["confirmed_fraud", "false_positive", "recovered", "needs_more_review"]
    features: dict[str, float] = Field(default_factory=dict)
    analyst: str = Field(min_length=1, max_length=200)
    evidence_refs: list[str] = Field(default_factory=list, max_length=100)


FEATURE_NAMES = [
    "amount_zscore",
    "velocity_5m",
    "velocity_24h",
    "device_reputation",
    "device_fingerprint_reuse",
    "ip_risk",
    "geo_velocity_kmh",
    "account_age_days",
    "email_risk",
    "phone_risk",
    "behavior_deviation",
    "bot_score",
    "remote_access_tool",
    "deepfake_risk",
    "session_entropy",
    "beneficiary_risk",
    "graph_risk",
    "consortium_hits",
    "blacklist_confidence",
    "aml_risk",
    "payment_delay_seconds",
]

# Positive means a larger standardised value is normally risk increasing. Negative means
# the feature is generally protective at higher values. These are explanation semantics,
# not model weights.
RISK_DIRECTION = np.array(
    [1, 1, 1, 1, 1, 1, 1, -1, 1, 1, 1, 1, 1, 1, -1, 1, 1, 1, 1, 1, 1],
    dtype=float,
)


def build_demo_training_matrix() -> np.ndarray:
    rng = np.random.default_rng(42)
    normal = rng.normal(
        loc=[0.8, 1.8, 6, 18, 2, 19, 80, 420, 12, 10, 15, 12, 0, 8, 62, 18, 21, 0.1, 11, 16, 80],
        scale=8,
        size=(400, len(FEATURE_NAMES)),
    )
    risky = rng.normal(
        loc=[4.5, 6.5, 24, 74, 9, 72, 980, 9, 71, 64, 78, 84, 1, 69, 22, 82, 79, 2, 78, 73, 540],
        scale=12,
        size=(90, len(FEATURE_NAMES)),
    )
    return np.clip(np.vstack([normal, risky]), 0, None)


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_model_bundle() -> tuple[StandardScaler, IsolationForest, str, str]:
    environment = os.getenv("APP_ENV", os.getenv("NODE_ENV", "development")).lower()
    artifact_value = os.getenv("MODEL_ARTIFACT_PATH")

    if artifact_value:
        artifact_path = Path(artifact_value).expanduser().resolve()
        if not artifact_path.is_file():
            raise RuntimeError(f"MODEL_ARTIFACT_PATH does not exist: {artifact_path}")

        expected_checksum = os.getenv("MODEL_ARTIFACT_SHA256", "").lower()
        if environment == "production" and not expected_checksum:
            raise RuntimeError("MODEL_ARTIFACT_SHA256 is required in production.")
        actual_checksum = sha256_file(artifact_path)
        if expected_checksum and actual_checksum != expected_checksum:
            raise RuntimeError("Model artifact checksum verification failed.")

        bundle = joblib.load(artifact_path)
        if not isinstance(bundle, dict):
            raise RuntimeError("Model artifact must contain a dictionary bundle.")
        scaler = bundle.get("scaler")
        model = bundle.get("model")
        feature_names = bundle.get("feature_names")
        model_version = bundle.get("model_version")
        if not isinstance(scaler, StandardScaler) or not isinstance(model, IsolationForest):
            raise RuntimeError("Model artifact contains incompatible scaler or model objects.")
        if feature_names != FEATURE_NAMES:
            raise RuntimeError("Model artifact feature schema does not match the service schema.")
        if not isinstance(model_version, str) or not model_version:
            raise RuntimeError("Model artifact does not declare model_version.")
        return scaler, model, model_version, f"artifact:{artifact_path.name}:{actual_checksum[:12]}"

    demo_mode = os.getenv("AI_DEMO_MODE", "false").lower() == "true"
    if environment == "production" or not demo_mode:
        raise RuntimeError(
            "No approved model artifact is configured. Set MODEL_ARTIFACT_PATH and "
            "MODEL_ARTIFACT_SHA256, or enable AI_DEMO_MODE only outside production."
        )

    scaler = StandardScaler()
    training = scaler.fit_transform(build_demo_training_matrix())
    model = IsolationForest(n_estimators=120, contamination=0.12, random_state=42)
    model.fit(training)
    return scaler, model, "demo-isolation-forest-2026.07", "synthetic-demo-data"


SCALER, MODEL, MODEL_VERSION, MODEL_SOURCE = load_model_bundle()

try:
    SHAP_EXPLAINER = shap.TreeExplainer(MODEL) if SHAP_AVAILABLE and shap is not None else None
except Exception:
    SHAP_EXPLAINER = None

app = FastAPI(
    title="African Guard AI Investigation Service",
    version="0.2.0",
    description="Versioned risk scoring and investigation assistance service.",
)


def feature_vector(request: ScoreRequest) -> np.ndarray:
    s = request.signals
    raw = np.array(
        [
            s.amount_zscore,
            s.velocity_5m,
            s.velocity_24h,
            s.device_reputation,
            s.device_fingerprint_reuse,
            s.ip_risk,
            s.geo_velocity_kmh,
            s.account_age_days,
            s.email_risk,
            s.phone_risk,
            s.behavior_deviation,
            s.bot_score,
            1.0 if s.remote_access_tool else 0.0,
            s.deepfake_risk,
            s.session_entropy,
            s.beneficiary_risk,
            s.graph_risk,
            s.consortium_hits,
            s.blacklist_confidence,
            s.aml_risk,
            s.payment_delay_seconds,
        ],
        dtype=float,
    )
    if raw.shape != (len(FEATURE_NAMES),):
        raise RuntimeError(
            f"Feature vector contains {raw.shape[0]} values; expected {len(FEATURE_NAMES)}."
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


def explanation_values(scaled: np.ndarray) -> tuple[str, np.ndarray]:
    if SHAP_EXPLAINER is not None:
        try:
            values = np.asarray(SHAP_EXPLAINER.shap_values(scaled), dtype=float).reshape(-1)
            if values.shape[0] == len(FEATURE_NAMES):
                return "shap_tree_contributions", values
        except Exception:
            pass

    # A transparent fallback when SHAP cannot explain the loaded estimator. This is explicitly
    # labelled as a proxy and must not be represented as causal model contribution.
    proxy = scaled.reshape(-1) * RISK_DIRECTION
    return "standardised_deviation_proxy", proxy


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "service": "african-guard-ai",
        "model_version": MODEL_VERSION,
        "model_source": MODEL_SOURCE,
        "feature_schema_size": len(FEATURE_NAMES),
        "shap_available": SHAP_EXPLAINER is not None,
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
            s.device_reputation * 0.14
            + min(s.device_fingerprint_reuse * 3, 18)
            + s.ip_risk * 0.13
            + s.email_risk * 0.12
            + s.phone_risk * 0.07
            + s.behavior_deviation * 0.18
            + s.bot_score * 0.12
            + (12 if s.remote_access_tool else 0)
            + s.deepfake_risk * 0.08
            + (10 if s.account_age_days < 14 else 0)
            + (8 if s.session_entropy < 20 else 0),
            0,
            100,
        )
    )
    graph_score = int(np.clip(s.graph_risk * 0.72 + s.beneficiary_risk * 0.28, 0, 100))
    consortium_score = int(
        np.clip(min(s.consortium_hits * 22, 60) + s.blacklist_confidence * 0.4, 0, 100)
    )
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

    explanation_method, contributions = explanation_values(scaled)
    ranked = sorted(
        zip(FEATURE_NAMES, contributions.tolist(), raw.flatten().tolist(), strict=True),
        key=lambda item: abs(item[1]),
        reverse=True,
    )[:6]

    return {
        "risk_score": risk_score,
        "risk_level": level(risk_score),
        "decision": "block"
        if s.sanctions_hit or risk_score >= 82
        else "review"
        if risk_score >= 60
        else "approve",
        "component_scores": {
            "ml_anomaly": anomaly_score,
            "behavioural_profile": behavior_score,
            "identity_graph": graph_score,
            "consortium_intelligence": consortium_score,
            "aml_sanctions": aml_score,
        },
        "explainability": {
            "method": explanation_method,
            "model_version": MODEL_VERSION,
            "warning": None
            if explanation_method == "shap_tree_contributions"
            else "Proxy values describe standardised deviation, not causal model contribution.",
            "top_factors": [
                {
                    "feature": name,
                    "impact": round(contribution, 4),
                    "raw_value": round(raw_value, 4),
                    "direction": "risk_increase" if contribution >= 0 else "risk_decrease",
                }
                for name, contribution, raw_value in ranked
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
            "Preserve the payment-recall window and request provider confirmation.",
            "Corroborate entity tokens through approved consortium channels.",
            "Route any SAR or STR draft through independent human review.",
        ],
        "sar_draft": (
            f"Case {case.case_id} indicates suspected financial crime involving anonymised entities "
            f"{', '.join(case.entities[:5])}. Investigation evidence supports review based on "
            f"{strongest.get('label', 'available case evidence')}."
        ),
    }


@app.post("/copilot/chat")
def chat(request: ChatRequest) -> dict[str, Any]:
    prompt = request.prompt.lower()
    case = request.case

    if "why" in prompt or "flagged" in prompt:
        evidence = ", ".join(item.get("label", "evidence") for item in case.evidence[:4])
        return {
            "answer": f"The case was flagged because {evidence or 'the supplied evidence requires review'}.",
            "citations": ["evidence", "timeline"],
        }

    if "link" in prompt or "entity" in prompt:
        return {
            "answer": f"Related anonymised entities: {', '.join(case.entities)}.",
            "citations": ["identity_graph"],
        }

    if "sar" in prompt:
        return {
            "answer": (
                f"Draft for human review: {case.title} involves suspected financial crime with "
                f"{case.loss_exposure:,.0f} exposure and converged fraud/AML indicators."
            ),
            "citations": ["sar_draft"],
        }

    return {
        "answer": (
            f"{case.title} is currently {case.status}. Prioritise evidence preservation, "
            "containment, customer impact, and authorised corroboration."
        ),
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
        "status": "pending_independent_review",
        "queued_for_retraining": False,
        "evidence_refs": request.evidence_refs,
        "drift_contribution": round(drift_contribution, 4),
    }


@app.get("/model/drift")
def drift() -> dict[str, Any]:
    return {
        "model_version": MODEL_VERSION,
        "status": "not_calculated",
        "drift_index": None,
        "message": "Connect the production feature and outcome stores to calculate drift.",
        "watchlist_features": [
            "payment_delay_seconds",
            "beneficiary_risk",
            "geo_velocity_kmh",
        ],
    }
