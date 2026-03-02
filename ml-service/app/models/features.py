import pandas as pd
import numpy as np
from typing import Optional


class FeatureEngineer:
    """Transforms raw order data into ML-ready features.

    All features are available at prediction time (when a new order comes in)
    and do NOT leak the target variable (is_delivered).

    Enhanced feature set (31 features) includes:
    - Temporal: hour, day, month, weekend, day_of_month, quarter
    - Value: order_value, subtotal, shipping_cost, value_to_shipping_ratio
    - Items: n_items
    - Customer: is_repeat, order_count, avg_order_value
    - Payment: has_boleto, has_credit_card, has_voucher, has_debit_card,
               n_payment_methods, max_installments
    - Product quality: avg_photos, avg_desc_length, avg_name_length, avg_volume,
                       avg_product_weight
    - Geography: region_order_volume, seller_customer_same_state, n_sellers
    - Category: category_avg_price, category_popularity
    - Delivery: estimated_delivery_days
    """

    def __init__(self, historical_data: Optional[pd.DataFrame] = None):
        self._region_volume = {}
        self._category_avg_price = {}
        self._category_volume = {}
        if historical_data is not None:
            self._compute_historical_stats(historical_data)

    def _compute_historical_stats(self, df: pd.DataFrame) -> None:
        """Pre-compute regional and category statistics (NO target leakage)."""
        if "customer_state" in df.columns:
            region_counts = df["customer_state"].value_counts()
            max_count = region_counts.max() if len(region_counts) > 0 else 1
            self._region_volume = (region_counts / max_count).to_dict()

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

        # ── Temporal features ──
        if "order_date" in order and order["order_date"]:
            dt = pd.to_datetime(order["order_date"])
            features["hour_of_day"] = dt.hour
            features["day_of_week"] = dt.dayofweek
            features["month"] = dt.month
            features["is_weekend"] = int(dt.dayofweek >= 5)
            features["day_of_month"] = dt.day
            features["quarter"] = dt.quarter
        else:
            features["hour_of_day"] = 12
            features["day_of_week"] = 2
            features["month"] = 6
            features["is_weekend"] = 0
            features["day_of_month"] = 15
            features["quarter"] = 2

        # ── Value features ──
        order_value = float(order.get("total_amount", 0))
        subtotal = float(order.get("subtotal", 0))
        shipping_cost = float(order.get("shipping_cost", 0))
        features["order_value"] = order_value
        features["subtotal"] = subtotal
        features["shipping_cost"] = shipping_cost
        features["value_to_shipping_ratio"] = (
            order_value / shipping_cost if shipping_cost > 0 else 0.0
        )

        # ── Item features ──
        features["n_items"] = int(order.get("n_items", 1))

        # ── Customer features ──
        features["is_repeat_customer"] = int(order.get("is_repeat_customer", False))
        features["customer_order_count"] = int(order.get("customer_order_count", 0))
        count = max(features["customer_order_count"], 1)
        total_spent = float(order.get("customer_total_spent", order_value))
        features["customer_avg_order_value"] = total_spent / count

        # ── Payment features (strong signal for COD risk) ──
        payment_method = str(order.get("payment_method") or "").lower()
        has_boleto = order.get("has_boleto")
        has_credit_card = order.get("has_credit_card")
        has_voucher = order.get("has_voucher")
        has_debit_card = order.get("has_debit_card")
        features["has_boleto"] = int(
            has_boleto if has_boleto is not None else int(payment_method in ("boleto", "cod", "cash_on_delivery"))
        )
        features["has_credit_card"] = int(
            has_credit_card if has_credit_card is not None else int(payment_method in ("credit_card", "credit"))
        )
        features["has_voucher"] = int(
            has_voucher if has_voucher is not None else int(payment_method == "voucher")
        )
        features["has_debit_card"] = int(
            has_debit_card if has_debit_card is not None else int(payment_method in ("debit_card", "debit"))
        )
        features["n_payment_methods"] = int(order.get("n_payment_methods", 1))
        features["max_installments"] = int(order.get("max_installments", 1))

        # ── Product quality features (seller effort proxy) ──
        features["avg_photos"] = float(order.get("avg_photos", 1.0))
        features["avg_desc_length"] = float(order.get("avg_desc_length", 500.0))
        features["avg_name_length"] = float(order.get("avg_name_length", 30.0))
        features["avg_volume"] = float(order.get("avg_volume", 10000.0))
        features["avg_product_weight"] = float(order.get("avg_product_weight", 1.0))

        # ── Geography features ──
        region = str(order.get("customer_state", order.get("wilaya_id", "")))
        features["region_order_volume"] = self._region_volume.get(region, 0.0)
        features["seller_customer_same_state"] = int(
            order.get("seller_customer_same_state", 0)
        )
        features["n_sellers"] = int(order.get("n_sellers", 1))

        # ── Category features ──
        category = str(order.get("product_category", "unknown"))
        features["category_avg_price"] = self._category_avg_price.get(category, 0.0)
        features["category_popularity"] = self._category_volume.get(category, 0.0)

        # ── Delivery features ──
        features["estimated_delivery_days"] = float(
            order.get("estimated_delivery_days", 7)
        )

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
            # Temporal (6)
            "hour_of_day",
            "day_of_week",
            "month",
            "is_weekend",
            "day_of_month",
            "quarter",
            # Value (4)
            "order_value",
            "subtotal",
            "shipping_cost",
            "value_to_shipping_ratio",
            # Items (1)
            "n_items",
            # Customer (3)
            "is_repeat_customer",
            "customer_order_count",
            "customer_avg_order_value",
            # Payment (6)
            "has_boleto",
            "has_credit_card",
            "has_voucher",
            "has_debit_card",
            "n_payment_methods",
            "max_installments",
            # Product quality (5)
            "avg_photos",
            "avg_desc_length",
            "avg_name_length",
            "avg_volume",
            "avg_product_weight",
            # Geography (3)
            "region_order_volume",
            "seller_customer_same_state",
            "n_sellers",
            # Category (2)
            "category_avg_price",
            "category_popularity",
            # Delivery (1)
            "estimated_delivery_days",
        ]
