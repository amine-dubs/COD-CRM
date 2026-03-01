import joblib
import pandas as pd
import numpy as np
from pathlib import Path
from typing import Optional

from app.config import settings


class DemandForecaster:
    """Time-series demand forecasting using Prophet or simple methods."""

    def __init__(self):
        self.models = {}
        self._loaded = False

    def load(self, model_dir: Optional[Path] = None) -> bool:
        """Load trained forecasting models per category."""
        model_dir = model_dir or settings.MODEL_DIR
        forecast_path = model_dir / "forecaster_models.joblib"

        if not forecast_path.exists():
            return False

        self.models = joblib.load(forecast_path)
        self._loaded = True
        return True

    def prepare_time_series(self, orders_df: pd.DataFrame, category: Optional[str] = None) -> pd.DataFrame:
        """Prepare daily time series from orders data.

        Expected columns: order_date, product_category (optional), total_amount
        """
        df = orders_df.copy()
        df["order_date"] = pd.to_datetime(df["order_date"])
        df["ds"] = df["order_date"].dt.date

        if category and "product_category" in df.columns:
            df = df[df["product_category"] == category]

        daily = df.groupby("ds").agg(
            y=("total_amount", "sum"),
            order_count=("total_amount", "count"),
        ).reset_index()
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

        model_key = category if category in self.models else "all"
        if model_key not in self.models:
            raise ValueError(f"No model found for category: {category}")

        model = self.models[model_key]

        future = model.make_future_dataframe(periods=periods)
        forecast_df = model.predict(future)

        # Get only future predictions
        result = forecast_df.tail(periods)[["ds", "yhat", "yhat_lower", "yhat_upper"]].copy()
        result["ds"] = result["ds"].dt.strftime("%Y-%m-%d")
        result["yhat"] = result["yhat"].clip(lower=0).round(2)
        result["yhat_lower"] = result["yhat_lower"].clip(lower=0).round(2)
        result["yhat_upper"] = result["yhat_upper"].clip(lower=0).round(2)

        return {
            "category": category,
            "periods": periods,
            "predictions": result.to_dict(orient="records"),
        }

    def forecast_simple(self, daily_data: pd.DataFrame, periods: int = 30) -> dict:
        """Simple moving average forecast as fallback when Prophet is not available."""
        if len(daily_data) < 7:
            return {"error": "Not enough data for forecasting (need at least 7 days)"}

        # 7-day moving average
        ma7 = daily_data["y"].tail(7).mean()
        # 30-day moving average
        ma30 = daily_data["y"].tail(30).mean() if len(daily_data) >= 30 else ma7

        last_date = pd.to_datetime(daily_data["ds"].max())
        predictions = []

        for i in range(1, periods + 1):
            date = last_date + pd.Timedelta(days=i)
            # Weighted average of short and long term trends
            predicted = ma7 * 0.6 + ma30 * 0.4
            predictions.append({
                "ds": date.strftime("%Y-%m-%d"),
                "yhat": round(float(predicted), 2),
                "yhat_lower": round(float(predicted * 0.7), 2),
                "yhat_upper": round(float(predicted * 1.3), 2),
            })

        return {
            "category": "all",
            "periods": periods,
            "method": "moving_average",
            "predictions": predictions,
        }

    def get_available_categories(self) -> list[str]:
        """Return list of categories with trained models."""
        return list(self.models.keys())
