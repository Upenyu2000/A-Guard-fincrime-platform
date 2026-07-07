import os
import unittest

os.environ.setdefault("AI_DEMO_MODE", "true")
os.environ.setdefault("APP_ENV", "test")

from services.ai.app.main import FEATURE_NAMES, BehaviourSignals, ScoreRequest, feature_vector, score


class ScoreServiceTests(unittest.TestCase):
    def test_feature_vector_matches_declared_schema(self) -> None:
        request = ScoreRequest(
            event_type="transaction",
            amount=1250,
            signals=BehaviourSignals(
                amount_zscore=4.2,
                velocity_5m=8,
                velocity_24h=31,
                device_reputation=72,
                device_fingerprint_reuse=9,
                ip_risk=78,
                geo_velocity_kmh=900,
                account_age_days=3,
                email_risk=61,
                phone_risk=54,
                behavior_deviation=83,
                bot_score=88,
                remote_access_tool=True,
                deepfake_risk=42,
                session_entropy=12,
                beneficiary_risk=81,
                graph_risk=76,
                consortium_hits=3,
                blacklist_confidence=89,
                aml_risk=64,
                payment_delay_seconds=480,
            ),
        )

        vector = feature_vector(request)
        self.assertEqual(vector.shape, (1, len(FEATURE_NAMES)))
        self.assertEqual(vector.shape[1], 21)

    def test_score_returns_a_valid_decision(self) -> None:
        response = score(
            ScoreRequest(
                event_type="transaction",
                amount=1250,
                signals=BehaviourSignals(
                    device_reputation=80,
                    ip_risk=84,
                    behavior_deviation=91,
                    bot_score=87,
                    remote_access_tool=True,
                    beneficiary_risk=75,
                    graph_risk=82,
                    aml_risk=70,
                ),
            )
        )

        self.assertIn(response["decision"], {"approve", "review", "block"})
        self.assertGreaterEqual(response["risk_score"], 0)
        self.assertLessEqual(response["risk_score"], 100)
        self.assertEqual(response["explainability"]["model_version"], "demo-isolation-forest-2026.07")


if __name__ == "__main__":
    unittest.main()
