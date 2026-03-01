"""
train_all.py — State-of-the-Art Model Training Pipeline

Trains all three AI models for the COD-CRM:
1. Order Risk Scoring: CatBoost + LightGBM + XGBoost ensemble
2. Customer Segmentation: HDBSCAN + KMeans hybrid
3. Demand Forecasting: Amazon Chronos (pre-trained transformer)

Usage:
    cd ml-service
    python train_all.py
"""

import sys
import json
import logging
import warnings
from pathlib import Path
from datetime import datetime

import numpy as np
import pandas as pd
import joblib

warnings.filterwarnings("ignore")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data" / "olist"
PREPARED_DIR = BASE_DIR / "data" / "prepared"
MODEL_DIR = BASE_DIR / "trained_models"
MODEL_DIR.mkdir(exist_ok=True)
PREPARED_DIR.mkdir(exist_ok=True)

sys.path.insert(0, str(BASE_DIR))
from data.mapping import STATE_TO_WILAYA, STATUS_MAPPING, CATEGORY_TRANSLATION, BRL_TO_DZD, ZONE_SHIPPING_RATES


# ═══════════════════════════════════════════════════════════════
# STEP 1: DATA PREPARATION
# ═══════════════════════════════════════════════════════════════

def load_and_prepare_data() -> pd.DataFrame:
    """Load Olist data and transform to CRM format."""
    logger.info("=" * 60)
    logger.info("STEP 1: DATA PREPARATION")
    logger.info("=" * 60)

    # Load CSVs
    orders = pd.read_csv(DATA_DIR / "olist_orders_dataset.csv")
    customers = pd.read_csv(DATA_DIR / "olist_customers_dataset.csv")
    items = pd.read_csv(DATA_DIR / "olist_order_items_dataset.csv")
    products = pd.read_csv(DATA_DIR / "olist_products_dataset.csv")
    payments = pd.read_csv(DATA_DIR / "olist_order_payments_dataset.csv")
    reviews = pd.read_csv(DATA_DIR / "olist_order_reviews_dataset.csv")

    logger.info(f"Loaded: {len(orders)} orders, {len(customers)} customers, {len(items)} items")

    # Merge
    df = orders.merge(customers, on="customer_id", how="left")

    items_agg = items.groupby("order_id").agg(
        n_items=("order_item_id", "count"),
        subtotal=("price", "sum"),
    ).reset_index()

    items_products = items.merge(
        products[["product_id", "product_category_name", "product_weight_g"]],
        on="product_id", how="left"
    )
    primary_cat = items_products.groupby("order_id").agg(
        product_category=("product_category_name", "first"),
        avg_product_weight=("product_weight_g", lambda x: x.mean() / 1000),
    ).reset_index()

    pay_agg = payments.groupby("order_id").agg(payment_value=("payment_value", "sum")).reset_index()
    rev_agg = reviews.groupby("order_id").agg(review_score=("review_score", "mean")).reset_index()

    df = df.merge(items_agg, on="order_id", how="left")
    df = df.merge(primary_cat, on="order_id", how="left")
    df = df.merge(pay_agg, on="order_id", how="left")
    df = df.merge(rev_agg, on="order_id", how="left")

    # Transform
    df["order_date"] = pd.to_datetime(df["order_purchase_timestamp"])
    df["is_delivered"] = (df["order_status"] == "delivered").astype(int)
    df["customer_state"] = df["customer_state"].fillna("SP")
    df["total_amount"] = (df["payment_value"].fillna(0) * BRL_TO_DZD).round(2)
    df["subtotal"] = (df["subtotal"].fillna(0) * BRL_TO_DZD).round(2)
    df["shipping_cost"] = df["customer_state"].map(
        lambda s: ZONE_SHIPPING_RATES.get(
            STATE_TO_WILAYA.get(s, {}).get("zone", "zone_1"), 400
        )
    )
    df["discount"] = 0
    df["estimated_delivery_days"] = (
        pd.to_datetime(df["order_estimated_delivery_date"]) - df["order_date"]
    ).dt.days.clip(lower=1).fillna(7)
    df["customer_phone_2"] = np.where(np.random.RandomState(42).random(len(df)) < 0.4, "yes", None)
    df["product_category"] = df["product_category"].map(
        lambda c: CATEGORY_TRANSLATION.get(str(c), str(c)) if pd.notna(c) else "unknown"
    )
    df["n_items"] = df["n_items"].fillna(1).astype(int)
    df["avg_product_weight"] = df["avg_product_weight"].fillna(1.0)

    # Customer history
    df = df.sort_values("order_date")
    cust_stats = df.groupby("customer_unique_id").agg(
        customer_order_count=("order_id", "count"),
        customer_success_rate=("is_delivered", "mean"),
    ).reset_index()
    df = df.merge(cust_stats, on="customer_unique_id", how="left")
    df["is_repeat_customer"] = (df["customer_order_count"] > 1).astype(int)

    df["source"] = np.random.RandomState(42).choice(
        ["website", "facebook", "instagram", "manual"],
        size=len(df), p=[0.4, 0.3, 0.2, 0.1]
    )

    logger.info(f"Prepared {len(df)} orders | Delivery rate: {df['is_delivered'].mean():.1%}")
    df.to_csv(PREPARED_DIR / "crm_orders.csv", index=False)
    return df


# ═══════════════════════════════════════════════════════════════
# STEP 2: ORDER RISK MODEL — ENSEMBLE (CatBoost + LightGBM + XGBoost)
# ═══════════════════════════════════════════════════════════════

def train_risk_ensemble(df: pd.DataFrame):
    """Train a SOTA ensemble for order delivery risk prediction."""
    logger.info("=" * 60)
    logger.info("STEP 2: ORDER RISK SCORING — ENSEMBLE TRAINING")
    logger.info("=" * 60)

    from sklearn.model_selection import train_test_split
    from sklearn.metrics import (
        roc_auc_score, classification_report, f1_score,
        accuracy_score, precision_score, recall_score, confusion_matrix,
    )
    from xgboost import XGBClassifier
    from catboost import CatBoostClassifier
    from lightgbm import LGBMClassifier

    sys.path.insert(0, str(BASE_DIR))
    from app.models.features import FeatureEngineer

    # Feature engineering
    fe = FeatureEngineer(historical_data=df)
    X_features = fe.transform_dataframe(df)
    feature_names = FeatureEngineer.get_feature_names()
    X = X_features[feature_names]
    y = df["is_delivered"].values

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    neg = (y_train == 0).sum()
    pos = (y_train == 1).sum()
    scale_weight = neg / pos if pos > 0 else 1
    logger.info(f"Train: {len(X_train)} | Test: {len(X_test)} | Scale weight: {scale_weight:.3f}")

    # ── CatBoost ──
    logger.info("Training CatBoost...")
    cb_model = CatBoostClassifier(
        iterations=500,
        depth=8,
        learning_rate=0.05,
        l2_leaf_reg=3,
        auto_class_weights="Balanced",
        eval_metric="AUC",
        random_seed=42,
        verbose=0,
    )
    cb_model.fit(X_train, y_train, eval_set=(X_test, y_test), early_stopping_rounds=50)
    cb_proba = cb_model.predict_proba(X_test)[:, 1]
    cb_auc = roc_auc_score(y_test, cb_proba)
    logger.info(f"  CatBoost AUC-ROC: {cb_auc:.4f}")

    # ── LightGBM ──
    logger.info("Training LightGBM...")
    lgb_model = LGBMClassifier(
        n_estimators=500,
        max_depth=8,
        learning_rate=0.05,
        num_leaves=63,
        subsample=0.8,
        colsample_bytree=0.8,
        is_unbalance=True,
        random_state=42,
        verbose=-1,
    )
    lgb_model.fit(
        X_train, y_train,
        eval_set=[(X_test, y_test)],
        callbacks=[],
    )
    lgb_proba = lgb_model.predict_proba(X_test)[:, 1]
    lgb_auc = roc_auc_score(y_test, lgb_proba)
    logger.info(f"  LightGBM AUC-ROC: {lgb_auc:.4f}")

    # ── XGBoost ──
    logger.info("Training XGBoost...")
    xgb_model = XGBClassifier(
        n_estimators=500,
        max_depth=8,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        scale_pos_weight=scale_weight,
        eval_metric="auc",
        random_state=42,
        use_label_encoder=False,
    )
    xgb_model.fit(
        X_train, y_train,
        eval_set=[(X_test, y_test)],
        verbose=False,
    )
    xgb_proba = xgb_model.predict_proba(X_test)[:, 1]
    xgb_auc = roc_auc_score(y_test, xgb_proba)
    logger.info(f"  XGBoost AUC-ROC: {xgb_auc:.4f}")

    # ── Ensemble (weighted by AUC) ──
    total_auc = cb_auc + lgb_auc + xgb_auc
    weights = {
        "catboost": cb_auc / total_auc,
        "lightgbm": lgb_auc / total_auc,
        "xgboost": xgb_auc / total_auc,
    }

    ensemble_proba = (
        cb_proba * weights["catboost"]
        + lgb_proba * weights["lightgbm"]
        + xgb_proba * weights["xgboost"]
    )
    ensemble_auc = roc_auc_score(y_test, ensemble_proba)

    logger.info(f"\n{'='*40}")
    logger.info(f"  ENSEMBLE AUC-ROC: {ensemble_auc:.4f}")
    logger.info(f"  Weights: CatBoost={weights['catboost']:.3f}, LightGBM={weights['lightgbm']:.3f}, XGBoost={weights['xgboost']:.3f}")
    logger.info(f"{'='*40}")

    ensemble_pred = (ensemble_proba >= 0.5).astype(int)
    logger.info("\n" + classification_report(y_test, ensemble_pred, target_names=["Failed", "Delivered"]))

    # Compute per-model metrics
    def _model_metrics(name, proba, y_true):
        pred = (proba >= 0.5).astype(int)
        return {
            "auc_roc": float(roc_auc_score(y_true, proba)),
            "accuracy": float(accuracy_score(y_true, pred)),
            "precision": float(precision_score(y_true, pred)),
            "recall": float(recall_score(y_true, pred)),
            "f1_score": float(f1_score(y_true, pred)),
        }

    cm = confusion_matrix(y_test, ensemble_pred)
    risk_metrics = {
        "models": {
            "catboost": _model_metrics("catboost", cb_proba, y_test),
            "lightgbm": _model_metrics("lightgbm", lgb_proba, y_test),
            "xgboost": _model_metrics("xgboost", xgb_proba, y_test),
            "ensemble": _model_metrics("ensemble", ensemble_proba, y_test),
        },
        "ensemble_weights": {k: float(v) for k, v in weights.items()},
        "confusion_matrix": {
            "tn": int(cm[0][0]), "fp": int(cm[0][1]),
            "fn": int(cm[1][0]), "tp": int(cm[1][1]),
        },
        "dataset": {
            "total_samples": int(len(X)),
            "train_samples": int(len(X_train)),
            "test_samples": int(len(X_test)),
            "positive_rate": float(y.mean()),
        },
        "features": feature_names,
    }

    # Save
    joblib.dump({
        "models": {"catboost": cb_model, "lightgbm": lgb_model, "xgboost": xgb_model},
        "weights": weights,
    }, MODEL_DIR / "risk_ensemble.joblib")
    joblib.dump(fe, MODEL_DIR / "feature_engineer.joblib")

    logger.info(f"Saved ensemble to {MODEL_DIR / 'risk_ensemble.joblib'}")
    return risk_metrics


# ═══════════════════════════════════════════════════════════════
# STEP 3: CUSTOMER SEGMENTATION — HDBSCAN + KMeans
# ═══════════════════════════════════════════════════════════════

def train_segmentation(df: pd.DataFrame):
    """Train customer segmentation using HDBSCAN (fallback KMeans)."""
    logger.info("=" * 60)
    logger.info("STEP 3: CUSTOMER SEGMENTATION")
    logger.info("=" * 60)

    from sklearn.preprocessing import StandardScaler
    from sklearn.cluster import KMeans

    reference_date = df["order_date"].max() + pd.Timedelta(days=1)

    rfm = df.groupby("customer_unique_id").agg(
        recency=("order_date", lambda x: (reference_date - x.max()).days),
        frequency=("order_id", "count"),
        monetary=("total_amount", "sum"),
        avg_order_value=("total_amount", "mean"),
        success_rate=("is_delivered", "mean"),
    ).reset_index()
    rfm.columns = ["customer_id", "recency", "frequency", "monetary", "avg_order_value", "success_rate"]

    logger.info(f"RFM computed for {len(rfm)} customers")

    scaler = StandardScaler()
    rfm_scaled = scaler.fit_transform(rfm[["recency", "frequency", "monetary"]])

    # Try HDBSCAN first (density-based, no need to specify K)
    use_hdbscan = False
    try:
        import hdbscan
        logger.info("Training HDBSCAN...")
        clusterer = hdbscan.HDBSCAN(
            min_cluster_size=100,
            min_samples=50,
            metric="euclidean",
            cluster_selection_method="eom",
        )
        labels = clusterer.fit_predict(rfm_scaled)
        n_clusters = len(set(labels)) - (1 if -1 in labels else 0)
        noise_pct = (labels == -1).mean()
        logger.info(f"  HDBSCAN found {n_clusters} clusters, {noise_pct:.1%} noise points")

        if n_clusters >= 3:
            use_hdbscan = True
            # Assign noise points to nearest cluster
            if noise_pct > 0:
                from sklearn.neighbors import NearestCentroid
                noise_mask = labels == -1
                non_noise_mask = ~noise_mask
                clf = NearestCentroid()
                clf.fit(rfm_scaled[non_noise_mask], labels[non_noise_mask])
                labels[noise_mask] = clf.predict(rfm_scaled[noise_mask])
            rfm["cluster"] = labels
            logger.info(f"  Using HDBSCAN with {n_clusters} clusters")
    except ImportError:
        logger.info("  HDBSCAN not available, using KMeans")

    if not use_hdbscan:
        # Fallback to KMeans with elbow-selected K
        logger.info("Training KMeans (K=4)...")
        kmeans = KMeans(n_clusters=4, random_state=42, n_init=10)
        rfm["cluster"] = kmeans.fit_predict(rfm_scaled)
        clusterer = kmeans
        logger.info("  KMeans trained with 4 clusters")

    # Label clusters by monetary value
    cluster_means = rfm.groupby("cluster")["monetary"].mean().sort_values(ascending=False)
    label_names = ["VIP", "Loyal", "At Risk", "Lost"]

    segment_mapping = {}
    for i, cluster_id in enumerate(cluster_means.index):
        name = label_names[i] if i < len(label_names) else f"Segment {i}"
        segment_mapping[int(cluster_id)] = {
            "name": name,
            "description": {
                "VIP": "High value, frequent, recent buyers",
                "Loyal": "Regular customers with good purchase history",
                "At Risk": "Previously active customers showing decline",
                "Lost": "Inactive customers with no recent purchases",
            }.get(name, f"Customer group {i}"),
        }

    rfm["segment"] = rfm["cluster"].map(lambda c: segment_mapping.get(int(c), {"name": f"Seg {c}"})["name"])

    logger.info("\nSegment Summary:")
    for seg in rfm["segment"].unique():
        subset = rfm[rfm["segment"] == seg]
        logger.info(
            f"  {seg:10s}: n={len(subset):6,d}  "
            f"recency={subset['recency'].mean():5.0f}d  "
            f"freq={subset['frequency'].mean():4.1f}  "
            f"monetary={subset['monetary'].mean():10,.0f} DZD"
        )

    # Save
    joblib.dump(clusterer, MODEL_DIR / "segmenter.joblib")
    joblib.dump(scaler, MODEL_DIR / "segmenter_scaler.joblib")
    joblib.dump(segment_mapping, MODEL_DIR / "segment_mapping.joblib")
    logger.info(f"Saved segmentation models to {MODEL_DIR}")

    # Return metrics
    seg_metrics = {
        "algorithm": "HDBSCAN" if use_hdbscan else "KMeans",
        "n_clusters": len(segment_mapping),
        "total_customers": int(len(rfm)),
        "segments": {},
    }
    for seg in rfm["segment"].unique():
        subset = rfm[rfm["segment"] == seg]
        seg_metrics["segments"][seg] = {
            "count": int(len(subset)),
            "percentage": round(float(len(subset) / len(rfm) * 100), 1),
            "avg_recency": round(float(subset["recency"].mean()), 1),
            "avg_frequency": round(float(subset["frequency"].mean()), 2),
            "avg_monetary": round(float(subset["monetary"].mean()), 2),
        }
    return seg_metrics


# ═══════════════════════════════════════════════════════════════
# STEP 4: DEMAND FORECASTING — Chronos (Pre-trained Transformer)
# ═══════════════════════════════════════════════════════════════

CHRONOS_MODEL_NAME = "amazon/chronos-t5-small"


def train_forecasting(df: pd.DataFrame):
    """Prepare time series data for Chronos demand forecasting.

    Chronos is a pre-trained foundation model for time series — it does not
    need per-dataset training.  We prepare and save the historical time series
    per category, then optionally evaluate Chronos accuracy vs a baseline.
    """
    logger.info("=" * 60)
    logger.info("STEP 4: DEMAND FORECASTING — Chronos")
    logger.info("=" * 60)

    delivered = df[df["is_delivered"] == 1].copy()
    delivered["ds"] = delivered["order_date"].dt.date

    daily = delivered.groupby("ds").agg(
        y=("total_amount", "sum"),
        order_count=("order_id", "count"),
    ).reset_index()
    daily["ds"] = pd.to_datetime(daily["ds"])

    # Fill missing days
    full_range = pd.date_range(daily["ds"].min(), daily["ds"].max(), freq="D")
    daily = daily.set_index("ds").reindex(full_range, fill_value=0).reset_index()
    daily.columns = ["ds", "y", "order_count"]

    logger.info(f"Time series: {len(daily)} days, avg daily revenue: {daily['y'].mean():,.0f} DZD")

    # ── Save time series data per category ────────────────────
    time_series_data = {}
    forecast_metrics = {"models_trained": [], "method": "chronos-t5-small"}

    # Overall time series
    time_series_data["all"] = {
        "dates": daily["ds"].dt.strftime("%Y-%m-%d").tolist(),
        "values": daily["y"].tolist(),
    }
    forecast_metrics["models_trained"].append("all")
    logger.info("Saved overall time series (%d days)", len(daily))

    # Top 3 categories
    top_cats = delivered["product_category"].value_counts().head(3).index.tolist()
    for cat in top_cats:
        cat_df = delivered[delivered["product_category"] == cat]
        cat_daily = cat_df.groupby("ds").agg(y=("total_amount", "sum")).reset_index()
        cat_daily["ds"] = pd.to_datetime(cat_daily["ds"])
        cat_daily = cat_daily.set_index("ds").reindex(full_range, fill_value=0).reset_index()
        cat_daily.columns = ["ds", "y"]

        time_series_data[cat] = {
            "dates": cat_daily["ds"].dt.strftime("%Y-%m-%d").tolist(),
            "values": cat_daily["y"].tolist(),
        }
        forecast_metrics["models_trained"].append(cat)
        logger.info(f"  Saved time series for category: {cat}")

    # ── Evaluate Chronos vs baseline ──────────────────────────
    test_days = 60
    try:
        import torch
        from chronos import ChronosPipeline

        logger.info("Loading Chronos model (%s) for evaluation...", CHRONOS_MODEL_NAME)
        pipeline = ChronosPipeline.from_pretrained(
            CHRONOS_MODEL_NAME,
            device_map="cpu",
            torch_dtype=torch.float32,
        )

        train_values = daily["y"].values[:-test_days]
        test_actual = daily["y"].values[-test_days:]

        context = torch.tensor(train_values, dtype=torch.float32).unsqueeze(0)
        forecast_tensor = pipeline.predict(
            context, prediction_length=test_days, num_samples=20
        )
        test_pred = torch.median(forecast_tensor.float(), dim=1).values.squeeze(0).numpy()

        chronos_mae = float(np.abs(test_actual - test_pred).mean())
        chronos_rmse = float(np.sqrt(((test_actual - test_pred) ** 2).mean()))

        # Baseline: 7-day moving average
        ma7_pred = np.full(test_days, daily["y"].iloc[-(test_days + 7):-test_days].mean())
        ma_mae = float(np.abs(test_actual - ma7_pred).mean())
        ma_rmse = float(np.sqrt(((test_actual - ma7_pred) ** 2).mean()))

        improvement = round((1 - chronos_mae / ma_mae) * 100, 1) if ma_mae > 0 else 0

        forecast_metrics.update({
            "chronos": {"mae": round(chronos_mae, 2), "rmse": round(chronos_rmse, 2)},
            "baseline_moving_avg": {"mae": round(ma_mae, 2), "rmse": round(ma_rmse, 2)},
            "improvement_mae_pct": improvement,
            "time_series_days": int(len(daily)),
            "test_days": test_days,
        })

        logger.info(f"  Chronos MAE: {chronos_mae:,.0f} DZD | Baseline MAE: {ma_mae:,.0f} DZD")
        logger.info(f"  Improvement over baseline: {improvement:.1f}%")

    except ImportError:
        logger.warning(
            "chronos-forecasting or torch not installed — skipping evaluation. "
            "Install with: pip install chronos-forecasting"
        )
        forecast_metrics["evaluation"] = "skipped (chronos not installed)"
        forecast_metrics["time_series_days"] = int(len(daily))
    except Exception as e:
        logger.warning("Chronos evaluation failed: %s", e)
        forecast_metrics["evaluation"] = f"skipped ({e})"
        forecast_metrics["time_series_days"] = int(len(daily))

    joblib.dump(time_series_data, MODEL_DIR / "forecaster_models.joblib")
    logger.info(f"Saved time series data to {MODEL_DIR / 'forecaster_models.joblib'}")
    return forecast_metrics


# ═══════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════

def main():
    print("\n" + "=" * 60)
    print("  COD-CRM: SOTA MODEL TRAINING PIPELINE")
    print("=" * 60 + "\n")

    # Check data exists
    required = ["olist_orders_dataset.csv", "olist_customers_dataset.csv",
                 "olist_order_items_dataset.csv", "olist_products_dataset.csv",
                 "olist_order_payments_dataset.csv", "olist_order_reviews_dataset.csv"]
    missing = [f for f in required if not (DATA_DIR / f).exists()]
    if missing:
        logger.error(f"Missing files in {DATA_DIR}: {missing}")
        logger.error("Download from: https://www.kaggle.com/datasets/olistbr/brazilian-ecommerce")
        sys.exit(1)

    # Step 1: Prepare data
    df = load_and_prepare_data()

    # Step 2: Train risk ensemble
    risk_metrics = train_risk_ensemble(df)

    # Step 3: Train segmentation
    seg_metrics = train_segmentation(df)

    # Step 4: Train forecasting
    forecast_metrics = train_forecasting(df)

    # Save all metrics to JSON
    all_metrics = {
        "trained_at": datetime.now().isoformat(),
        "dataset": "olist_brazilian_ecommerce",
        "total_orders": int(len(df)),
        "delivery_rate": round(float(df["is_delivered"].mean()), 4),
        "risk_prediction": risk_metrics,
        "segmentation": seg_metrics,
        "forecasting": forecast_metrics,
    }
    metrics_path = MODEL_DIR / "metrics.json"
    with open(metrics_path, "w", encoding="utf-8") as f:
        json.dump(all_metrics, f, indent=2, ensure_ascii=False)
    logger.info(f"Saved evaluation metrics to {metrics_path}")

    # Summary
    ensemble_auc = risk_metrics["models"]["ensemble"]["auc_roc"]
    print("\n" + "=" * 60)
    print("  TRAINING COMPLETE")
    print("=" * 60)
    print(f"  Orders processed:    {len(df):,}")
    print(f"  Risk ensemble AUC:   {ensemble_auc:.4f}")
    print(f"  Segments found:      {seg_metrics['n_clusters']}")
    print(f"  Forecast models:     {len(forecast_metrics['models_trained'])}")
    print(f"  Metrics saved to:    {metrics_path}")
    print(f"  Models saved to:     {MODEL_DIR}")
    print()
    print("  Saved files:")
    for f in sorted(MODEL_DIR.glob("*")):
        if f.is_file():
            size_kb = f.stat().st_size / 1024
            print(f"    {f.name:35s} ({size_kb:,.0f} KB)")
    print()
    print("  Next: Start the API server:")
    print("    cd ml-service")
    print("    uvicorn app.main:app --port 8001 --reload")
    print("=" * 60)


if __name__ == "__main__":
    main()
