import logging
from typing import Optional
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

from app.config import settings

logger = logging.getLogger(__name__)

CHRONOS_MODEL_NAME = "amazon/chronos-t5-small"


class DemandForecaster:
    """Time-series demand forecasting using Amazon Chronos (pre-trained transformer).

    Chronos is a foundation model for zero-shot time series forecasting.
    It produces probabilistic forecasts via sampling, from which we extract
    median predictions and confidence intervals (10th / 90th percentiles).
    """

    def __init__(self):
        self.time_series_data: dict[str, dict] = {}
        self.pipeline = None
        self._loaded = False

    def load(self, model_dir: Optional[Path] = None) -> bool:
        """Load saved time series data and initialize Chronos pipeline."""
        model_dir = model_dir or settings.MODEL_DIR
        path = model_dir / "forecaster_models.joblib"

        if not path.exists():
            return False

        try:
            data = joblib.load(path)
        except Exception as e:
            logger.warning("Could not load forecaster data: %s", e)
            return False

        # Auto-detect format: new (dict of date/value lists) vs legacy (Prophet objects)
        first_val = next(iter(data.values()), None)
        if first_val is None:
            return False

        if isinstance(first_val, dict) and "values" in first_val:
            # New Chronos-compatible format
            self.time_series_data = data
        else:
            # Legacy Prophet model format — extract training history
            if not self._extract_from_prophet(data):
                return False

        self._loaded = True
        self._init_chronos()
        return True

    def _extract_from_prophet(self, models: dict) -> bool:
        """Extract time series data from legacy Prophet model objects."""
        try:
            for key, model in models.items():
                if hasattr(model, "history"):
                    history = model.history
                    self.time_series_data[key] = {
                        "dates": history["ds"].dt.strftime("%Y-%m-%d").tolist(),
                        "values": history["y"].tolist(),
                    }
            return bool(self.time_series_data)
        except Exception as e:
            logger.warning("Could not extract data from Prophet models: %s", e)
            return False

    def _init_chronos(self):
        """Initialize the Chronos pipeline (downloads model on first run)."""
        try:
            import torch
            from chronos import ChronosPipeline

            logger.info("Loading Chronos model (%s)...", CHRONOS_MODEL_NAME)
            self.pipeline = ChronosPipeline.from_pretrained(
                CHRONOS_MODEL_NAME,
                device_map="cpu",
                torch_dtype=torch.float32,
            )
            logger.info("Chronos model loaded successfully")
        except ImportError:
            logger.warning(
                "chronos-forecasting or torch not installed. "
                "Install with: pip install chronos-forecasting. "
                "Falling back to statistical method."
            )
        except Exception as e:
            logger.warning("Could not load Chronos model: %s. Using statistical fallback.", e)

    # ── Public API ────────────────────────────────────────────

    def prepare_time_series(
        self, orders_df: pd.DataFrame, category: Optional[str] = None
    ) -> pd.DataFrame:
        """Prepare daily time series from orders data.

        Expected columns: order_date, product_category (optional), total_amount
        """
        df = orders_df.copy()
        df["order_date"] = pd.to_datetime(df["order_date"])
        df["ds"] = df["order_date"].dt.date

        if category and "product_category" in df.columns:
            df = df[df["product_category"] == category]

        daily = (
            df.groupby("ds")
            .agg(y=("total_amount", "sum"), order_count=("total_amount", "count"))
            .reset_index()
        )
        daily["ds"] = pd.to_datetime(daily["ds"])

        # Fill missing dates with 0
        full_range = pd.date_range(daily["ds"].min(), daily["ds"].max(), freq="D")
        daily = daily.set_index("ds").reindex(full_range, fill_value=0).reset_index()
        daily.columns = ["ds", "y", "order_count"]
        return daily

    def forecast(self, category: str = "all", periods: int = 30) -> dict:
        """Generate demand forecast for a category.

        Returns dict with dates, predicted values, and confidence intervals.
        """
        if not self._loaded:
            raise RuntimeError("Models not loaded. Call load() first.")

        model_key = category if category in self.time_series_data else "all"
        if model_key not in self.time_series_data:
            raise ValueError(f"No data found for category: {category}")

        ts = self.time_series_data[model_key]
        values = np.array(ts["values"], dtype=np.float64)
        dates = pd.to_datetime(ts["dates"])
        last_date = dates.max()

        if self.pipeline is not None:
            return self._forecast_chronos(values, last_date, category, periods)
        return self._forecast_statistical(values, last_date, category, periods)

    def get_available_categories(self) -> list[str]:
        """Return list of categories with available time series data."""
        return list(self.time_series_data.keys())

    # ── Chronos Forecasting ───────────────────────────────────

    def _forecast_chronos(
        self, values: np.ndarray, last_date, category: str, periods: int
    ) -> dict:
        """Forecast using the Chronos pre-trained transformer."""
        import torch

        context = torch.tensor(values, dtype=torch.float32).unsqueeze(0)  # (1, T)

        forecast_tensor = self.pipeline.predict(
            context, prediction_length=periods, num_samples=20
        )  # (1, num_samples, periods)

        # Extract median and confidence intervals (10th / 90th percentile)
        forecast_float = forecast_tensor.float()
        median = torch.median(forecast_float, dim=1).values  # (1, periods)
        lower = torch.quantile(forecast_float, 0.1, dim=1)  # (1, periods)
        upper = torch.quantile(forecast_float, 0.9, dim=1)  # (1, periods)

        # Remove batch dim → numpy, ensure at least 1-D
        median = np.atleast_1d(median.squeeze(0).numpy())
        lower = np.atleast_1d(lower.squeeze(0).numpy())
        upper = np.atleast_1d(upper.squeeze(0).numpy())

        future_dates = pd.date_range(
            start=last_date + pd.Timedelta(days=1), periods=periods, freq="D"
        )

        predictions = []
        for i in range(periods):
            predictions.append(
                {
                    "ds": future_dates[i].strftime("%Y-%m-%d"),
                    "yhat": round(max(0, float(median[i])), 2),
                    "yhat_lower": round(max(0, float(lower[i])), 2),
                    "yhat_upper": round(max(0, float(upper[i])), 2),
                }
            )

        return {
            "category": category,
            "periods": periods,
            "method": "chronos-t5-small",
            "predictions": predictions,
        }

    # ── Statistical Fallback ──────────────────────────────────

    def _forecast_statistical(
        self, values: np.ndarray, last_date, category: str, periods: int
    ) -> dict:
        """Simple moving-average forecast when Chronos is not available."""
        if len(values) < 7:
            raise ValueError("Not enough data for forecasting (need at least 7 days)")

        ma7 = float(values[-7:].mean())
        ma30 = float(values[-30:].mean()) if len(values) >= 30 else ma7

        predictions = []
        for i in range(1, periods + 1):
            date = last_date + pd.Timedelta(days=i)
            predicted = ma7 * 0.6 + ma30 * 0.4
            predictions.append(
                {
                    "ds": date.strftime("%Y-%m-%d"),
                    "yhat": round(max(0, predicted), 2),
                    "yhat_lower": round(max(0, predicted * 0.7), 2),
                    "yhat_upper": round(max(0, predicted * 1.3), 2),
                }
            )

        return {
            "category": category,
            "periods": periods,
            "method": "moving_average",
            "predictions": predictions,
        }
