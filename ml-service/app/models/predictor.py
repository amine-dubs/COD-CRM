import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from typing import Optional

from app.models.features import FeatureEngineer
from app.config import settings


class OrderRiskPredictor:
    """Ensemble of CatBoost + LightGBM + XGBoost for delivery risk prediction.

    Uses a soft-voting ensemble of three SOTA gradient boosting models.
    Each model independently predicts delivery success probability,
    and the final score is the weighted average (weights set by validation AUC).
    """

    RISK_CATEGORIES = {
        (0, 25): "critical",
        (25, 50): "high",
        (50, 75): "medium",
        (75, 101): "low",
    }

    def __init__(self):
        self.models = {}
        self.weights = {}
        self.feature_engineer: Optional[FeatureEngineer] = None
        self._loaded = False

    def load(self, model_path: Optional[Path] = None) -> bool:
        """Load trained ensemble models and feature engineer from disk."""
        model_dir = model_path or settings.MODEL_DIR
        ensemble_path = model_dir / "risk_ensemble.joblib"
        fe_path = model_dir / "feature_engineer.joblib"

        if ensemble_path.exists():
            data = joblib.load(ensemble_path)
            self.models = data["models"]
            self.weights = data["weights"]
        elif (model_dir / "risk_model.joblib").exists():
            self.models = {"single": joblib.load(model_dir / "risk_model.joblib")}
            self.weights = {"single": 1.0}
        else:
            return False

        if fe_path.exists():
            self.feature_engineer = joblib.load(fe_path)
        else:
            self.feature_engineer = FeatureEngineer()

        self._loaded = True
        return True

    def predict(self, order_data: dict) -> dict:
        """Predict delivery risk using ensemble voting."""
        if not self._loaded:
            raise RuntimeError("Model not loaded. Call load() first.")

        features = self.feature_engineer.transform_order(order_data)
        feature_names = FeatureEngineer.get_feature_names()
        X = pd.DataFrame([features])[feature_names]

        model_scores = {}
        weighted_sum = 0.0
        total_weight = 0.0

        for name, model in self.models.items():
            proba = model.predict_proba(X)[0]
            success_prob = float(proba[1]) if len(proba) > 1 else float(proba[0])
            model_scores[name] = round(success_prob * 100, 1)
            weight = self.weights.get(name, 1.0 / len(self.models))
            weighted_sum += success_prob * weight
            total_weight += weight

        ensemble_prob = weighted_sum / total_weight if total_weight > 0 else 0.5
        score = round(ensemble_prob * 100, 1)

        category = self._get_category(score)
        reasons = self._get_risk_reasons(features, score)
        recommendation = self._get_recommendation(category)

        return {
            "score": score,
            "category": category,
            "success_probability": round(ensemble_prob, 4),
            "reasons": reasons,
            "recommendation": recommendation,
            "model_scores": model_scores,
        }

    def predict_batch(self, orders: list[dict]) -> list[dict]:
        return [self.predict(order) for order in orders]

    def _get_category(self, score: float) -> str:
        for (low, high), cat in self.RISK_CATEGORIES.items():
            if low <= score < high:
                return cat
        return "medium"

    def _get_risk_reasons(self, features: dict, score: float) -> list[str]:
        reasons = []
        if features.get("region_success_rate", 1) < 0.6:
            reasons.append("Region has low historical delivery success rate")
        if features.get("category_success_rate", 1) < 0.6:
            reasons.append("Product category has high return rate")
        if features.get("order_value", 0) > 10000:
            reasons.append("High order value increases risk")
        if not features.get("has_alt_phone", 0):
            reasons.append("No alternative phone number provided")
        if features.get("customer_order_count", 0) == 0:
            reasons.append("First-time customer (no history)")
        if features.get("is_weekend", 0):
            reasons.append("Weekend order (lower confirmation rates)")
        if features.get("estimated_delivery_days", 0) > 10:
            reasons.append("Long estimated delivery time")
        return reasons

    def _get_recommendation(self, category: str) -> str:
        recommendations = {
            "critical": "URGENT: Verify customer by phone before processing. Consider requiring address confirmation.",
            "high": "Priority confirmation call recommended. Verify shipping address and customer availability.",
            "medium": "Standard processing. Monitor delivery status closely.",
            "low": "Low risk order. Proceed with standard workflow.",
        }
        return recommendations.get(category, "Standard processing.")
