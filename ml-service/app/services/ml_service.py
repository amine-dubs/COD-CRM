import logging
from typing import Optional

from app.models.predictor import OrderRiskPredictor
from app.models.segmenter import CustomerSegmenter
from app.models.forecaster import DemandForecaster
from app.config import settings

logger = logging.getLogger(__name__)


class MLService:
    """Orchestrates all ML model operations."""

    def __init__(self):
        self.predictor = OrderRiskPredictor()
        self.segmenter = CustomerSegmenter()
        self.forecaster = DemandForecaster()
        self._segmentation_cache = None
        self._load_models()

    def _load_models(self):
        """Attempt to load all trained models on startup."""
        if self.predictor.load():
            logger.info("Risk prediction model loaded successfully")
        else:
            logger.warning("Risk prediction model not found at %s", settings.MODEL_DIR / "risk_model.joblib")

        if self.segmenter.load():
            logger.info("Customer segmentation model loaded successfully")
        else:
            logger.warning("Segmentation model not found at %s", settings.MODEL_DIR / "segmenter.joblib")

        if self.forecaster.load():
            logger.info("Demand forecasting models loaded successfully")
        else:
            logger.warning("Forecasting models not found at %s", settings.MODEL_DIR / "forecaster_models.joblib")

    # ── Order Risk Prediction ────────────────────────────────

    def predict_order_risk(self, order_data: dict) -> dict:
        """Predict delivery risk for a single order."""
        if not self.predictor._loaded:
            raise RuntimeError(
                "Risk prediction model is not loaded. "
                "Train the model first using the 02_risk_model.ipynb notebook."
            )
        return self.predictor.predict(order_data)

    def predict_batch_risk(self, orders: list[dict]) -> list[dict]:
        """Predict risk for multiple orders."""
        if not self.predictor._loaded:
            raise RuntimeError("Risk prediction model is not loaded.")
        return self.predictor.predict_batch(orders)

    # ── Customer Segmentation ────────────────────────────────

    def get_customer_segments(self) -> dict:
        """Get cached customer segmentation results."""
        if self._segmentation_cache is not None:
            return self._segmentation_cache

        if not self.segmenter._loaded:
            raise RuntimeError(
                "Segmentation model is not loaded. "
                "Train the model first using the 03_segmentation.ipynb notebook."
            )
        raise RuntimeError("No segmentation data cached. Run segmentation first.")

    def get_segment_summary(self) -> list[dict]:
        """Get segment summary statistics."""
        segments = self.get_customer_segments()
        import pandas as pd
        df = pd.DataFrame(segments.get("customers", []))
        if df.empty:
            return []
        return self.segmenter.get_segment_summary(df)

    # ── Demand Forecasting ───────────────────────────────────

    def forecast_demand(self, category: str = "all", periods: int = 30) -> dict:
        """Generate demand forecast."""
        if not self.forecaster._loaded:
            raise RuntimeError(
                "Forecasting models are not loaded. "
                "Train the model first using the 04_forecasting.ipynb notebook."
            )
        return self.forecaster.forecast(category=category, periods=periods)

    def get_forecast_categories(self) -> list[str]:
        """List categories with available forecasting models."""
        if not self.forecaster._loaded:
            raise RuntimeError("Forecasting models are not loaded.")
        return self.forecaster.get_available_categories()

    # ── Model Management ─────────────────────────────────────

    def reload_models(self):
        """Reload all models from disk."""
        self._load_models()
        self._segmentation_cache = None
        return {
            "predictor": self.predictor._loaded,
            "segmenter": self.segmenter._loaded,
            "forecaster": self.forecaster._loaded,
        }


# Singleton instance
ml_service = MLService()
