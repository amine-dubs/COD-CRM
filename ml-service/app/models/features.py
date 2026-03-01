import pandas as pd
import numpy as np
from typing import Optional


class FeatureEngineer:
    """Transforms raw order data into ML-ready features.

    All features are available at prediction time (when a new order comes in)
    and do NOT leak the target variable (is_delivered).
    """

    def __init__(self, historical_data: Optional[pd.DataFrame] = None):
        self._region_volume = {}       # orders per region (popularity proxy)
        self._category_avg_price = {}  # avg order value per category
        self._category_volume = {}     # orders per category (popularity proxy)
        if historical_data is not None:
            self._compute_historical_stats(historical_data)

    def _compute_historical_stats(self, df: pd.DataFrame) -> None:
        """Pre-compute regional and category statistics (NO target leakage)."""
        # Region: order volume (proxy for infrastructure / reliability)
        if "customer_state" in df.columns:
            region_counts = df["customer_state"].value_counts()
            max_count = region_counts.max() if len(region_counts) > 0 else 1
            self._region_volume = (region_counts / max_count).to_dict()

        # Category: average price and volume (proxy for category characteristics)
        if "product_category" in df.columns:
            if "total_amount" in df.columns:
                self._category_avg_price = (
                    df.groupby("product_category")["total_amount"].mean().to_dict()
                )
            cat_counts = df["product_category"].value_counts()
            max_count = cat_counts.max() if len(cat_counts) > 0 else 1
            self._category_volume = (cat_counts / max_count).to_dict()

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
        order_value = float(order.get("total_amount", 0))
        shipping_cost = float(order.get("shipping_cost", 0))
        features["order_value"] = order_value
        features["shipping_cost"] = shipping_cost
        features["discount"] = float(order.get("discount", 0))
        features["subtotal"] = float(order.get("subtotal", 0))

        # Value ratios (indicative of order commitment / quality)
        features["value_to_shipping_ratio"] = (
            order_value / shipping_cost if shipping_cost > 0 else 0.0
        )

        # Item features
        features["n_items"] = int(order.get("n_items", 1))

        # Customer features (no target leakage — order count/repeat are behavioral)
        features["has_alt_phone"] = int(bool(order.get("customer_phone_2")))
        features["is_repeat_customer"] = int(order.get("is_repeat_customer", False))
        features["customer_order_count"] = int(order.get("customer_order_count", 0))

        # Customer lifetime value proxy (avg amount per order)
        count = max(features["customer_order_count"], 1)
        total_spent = float(order.get("customer_total_spent", order_value))
        features["customer_avg_order_value"] = total_spent / count

        # Source channel (one-hot: website, facebook, instagram, manual)
        source = str(order.get("source", "website")).lower()
        features["source_is_social"] = int(source in ("facebook", "instagram"))

        # Regional features (volume-based, NOT target-based)
        region = str(order.get("customer_state", order.get("wilaya_id", "")))
        features["region_order_volume"] = self._region_volume.get(region, 0.0)

        # Product features (price & volume based, NOT target-based)
        category = str(order.get("product_category", "unknown"))
        features["category_avg_price"] = self._category_avg_price.get(category, 0.0)
        features["category_popularity"] = self._category_volume.get(category, 0.0)

        # Delivery features
        features["estimated_delivery_days"] = float(
            order.get("estimated_delivery_days", 7)
        )

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
            "value_to_shipping_ratio",
            "n_items",
            "has_alt_phone",
            "is_repeat_customer",
            "customer_order_count",
            "customer_avg_order_value",
            "source_is_social",
            "region_order_volume",
            "category_avg_price",
            "category_popularity",
            "estimated_delivery_days",
            "avg_product_weight",
        ]
