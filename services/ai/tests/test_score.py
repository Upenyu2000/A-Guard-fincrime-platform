import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from services.ai.app.main import BehaviourSignals, ScoreRequest, health, score


def test_health_contract() -> None:
    payload = health()
    assert payload["status"] == "ok"
    assert payload["service"] == "african-guard-ai"
    assert "model" in payload


def test_sanctions_hit_blocks_and_explains() -> None:
    result = score(
        ScoreRequest(
            event_type="transaction",
            amount=6900,
            channel="mobile",
            signals=BehaviourSignals(
                amount_zscore=4.8,
                velocity_5m=7,
                velocity_24h=19,
                device_reputation=76,
                ip_risk=72,
                graph_risk=84,
                beneficiary_risk=88,
                consortium_hits=2,
                blacklist_confidence=91,
                aml_risk=95,
                sanctions_hit=True,
            ),
        )
    )
    assert result["decision"] == "block"
    assert result["risk_level"] in {"high", "critical"}
    assert result["component_scores"]["aml_sanctions"] == 100
    assert len(result["explainability"]["top_factors"]) > 0


def test_normal_activity_is_not_forced_high_risk() -> None:
    result = score(
        ScoreRequest(
            event_type="transaction",
            amount=52,
            channel="mobile",
            signals=BehaviourSignals(
                amount_zscore=0.2,
                velocity_5m=1,
                velocity_24h=3,
                device_reputation=8,
                ip_risk=6,
                graph_risk=4,
                beneficiary_risk=5,
                aml_risk=3,
            ),
        )
    )
    assert result["decision"] in {"approve", "review"}
    assert result["component_scores"]["aml_sanctions"] < 20


if __name__ == "__main__":
    test_health_contract()
    test_sanctions_hit_blocks_and_explains()
    test_normal_activity_is_not_forced_high_risk()
    print("AI scoring tests passed.")
