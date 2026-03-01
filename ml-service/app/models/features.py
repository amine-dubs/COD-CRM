import pandas as pd
import numpy as np
from typing import Optional


class FeatureEngineer:
    """Transforms raw order data into ML-ready features."""

    def __init__(self, historical_data: Optional[pd.DataFrame] = None):
        self._region_stats = {}
        self._category_stats = {}
        if historical_data is not None:
            self._compute_historical_stats(historical_data)

    def _compute_historical_stats(self, df: pd.DataFrame) -> None:
        """Pre-compute regional and category delivery success rates from historical data."""
        if "is_delivered" not in df.columns:
            return
        if "customer_state" in df.columns:
            self._region_stats = (
                df.groupby("customer_state")["is_delivered"]
                .mean()
                .to_dict()
            )
        if "product_category" in df.columns:
            self._category_stats = (
                df.groupby("product_category")["is_delivered"]
                .mean()
                .to_dict()
            )

    def transform_order(self, order: dict) -> dict:
        """Transform a single order dict into feature dict for prediction."""
        features = {}

        # Temporal features
        if "order_date" in order and order["order_date"]:
            dt = pd.to_datetime(order["order_date"])
            features["hour_of_day"] = dt.hour
            features["day_of_week"] = dt.dayofweek
            features["month"] = dt.month
            features["is_weekend"] = int(dt.dayofweek >= 5)
        else:
            features["hour_of_day"] = 12
            features["day_of_week"] = 2
            features["month"] = 6
            features["is_weekend"] = 0

        # Value features
        features["order_value"] = float(order.get("total_amount", 0))
        features["shipping_cost"] = float(order.get("shipping_cost", 0))
        features["discount"] = float(order.get("discount", 0))
        features["subtotal"] = float(order.get("subtotal", 0))

        # Item features
        features["n_items"] = int(order.get("n_items", 1))

        # Customer features
        features["has_alt_phone"] = int(bool(order.get("customer_phone_2")))
        features["is_repeat_customer"] = int(order.get("is_repeat_customer", False))
        features["customer_order_count"] = int(order.get("customer_order_count", 0))
        features["customer_success_rate"] = float(order.get("customer_success_rate", 0.5))

        # Regional features
        region = order.get("customer_state", order.get("wilaya_id", ""))
        features["region_success_rate"] = self._region_stats.get(str(region), 0.5)

        # Product features
        category = order.get("product_category", "unknown")
        features["category_success_rate"] = self._category_stats.get(str(category), 0.5)

        # Delivery features
        features["estimated_delivery_days"] = float(order.get("estimated_delivery_days", 7))

        # Product weight
        features["avg_product_weight"] = float(order.get("avg_product_weight", 1.0))

        return features

    def transform_dataframe(self, df: pd.DataFrame) -> pd.DataFrame:
        """Transform a full DataFrame into feature matrix."""
        features_list = []
        for _, row in df.iterrows():
            features_list.append(self.transform_order(row.to_dict()))
        return pd.DataFrame(features_list)

    @staticmethod
    def get_feature_names() -> list:
        """Return ordered list of feature names used by the model."""
        return [
            "hour_of_day",
            "day_of_week",
            "month",
            "is_weekend",
            "order_value",
            "shipping_cost",
            "discount",
            "subtotal",
            "n_items",
            "has_alt_phone",
            "is_repeat_customer",
            "customer_order_count",
            "customer_success_rate",
            "region_success_rate",
            "category_success_rate",
            "estimated_delivery_days",
            "avg_product_weight",
        ]
