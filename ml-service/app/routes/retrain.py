import json
import logging
import shutil
from pathlib import Path

import pandas as pd
from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse

from app.config import settings
from app.services.ml_service import ml_service

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/upload-and-train")
async def retrain_from_csv(file: UploadFile = File(...)):
    """
    Retrain all models from an uploaded CSV dataset.

    The CSV must contain at minimum these columns:
      - order_status: delivery outcome (e.g. 'delivered', 'canceled')
      - order_purchase_timestamp: order date
      - payment_value: order amount
      - customer_unique_id: unique customer identifier

    Optional columns (improve model quality):
      - customer_state: region/wilaya identifier
      - product_category_name: product category
      - order_estimated_delivery_date: estimated delivery date
      - product_weight_g: product weight in grams

    After training, models are saved and auto-reloaded.
    Previous models are backed up to trained_models/backup/.
    """
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted.")

    try:
        # Read uploaded CSV
        content = await file.read()
        import io
        df = pd.read_csv(io.BytesIO(content))
        logger.info(f"Received CSV: {len(df)} rows, {len(df.columns)} columns")

        # Validate required columns
        required = ["order_status", "order_purchase_timestamp", "payment_value", "customer_unique_id"]
        missing = [c for c in required if c not in df.columns]
        if missing:
            raise HTTPException(
                status_code=400,
                detail=f"Missing required columns: {missing}. "
                       f"Required: {required}. Got: {list(df.columns)}"
            )

        # Backup existing models
        backup_dir = settings.MODEL_DIR / "backup"
        backup_dir.mkdir(exist_ok=True)
        for f in settings.MODEL_DIR.glob("*.joblib"):
            shutil.copy2(f, backup_dir / f.name)
        metrics_file = settings.MODEL_DIR / "metrics.json"
        if metrics_file.exists():
            shutil.copy2(metrics_file, backup_dir / "metrics.json")
        logger.info(f"Backed up existing models to {backup_dir}")

        # Run the training pipeline
        from train_all import (
            train_risk_ensemble,
            train_segmentation,
            train_forecasting,
        )
        from app.models.features import FeatureEngineer
        import numpy as np
        from datetime import datetime

        # Prepare the data (adapt to expected format)
        df = _prepare_custom_data(df)
        logger.info(f"Prepared {len(df)} orders for training")

        # Train all models
        risk_metrics = train_risk_ensemble(df)
        seg_metrics = train_segmentation(df)
        forecast_metrics = train_forecasting(df)

        # Save metrics
        all_metrics = {
            "trained_at": datetime.now().isoformat(),
            "dataset": "custom_upload",
            "source_file": file.filename,
            "total_orders": int(len(df)),
            "delivery_rate": round(float(df["is_delivered"].mean()), 4),
            "risk_prediction": risk_metrics,
            "segmentation": seg_metrics,
            "forecasting": forecast_metrics,
        }
        with open(metrics_file, "w", encoding="utf-8") as f:
            json.dump(all_metrics, f, indent=2, ensure_ascii=False)

        # Reload models in the running service
        reload_status = ml_service.reload_models()
        logger.info(f"Models reloaded: {reload_status}")

        return {
            "success": True,
            "message": "Models retrained and reloaded successfully.",
            "data": {
                "orders_processed": int(len(df)),
                "delivery_rate": all_metrics["delivery_rate"],
                "risk_auc": risk_metrics["models"]["ensemble"]["auc_roc"],
                "risk_f1": risk_metrics["models"]["ensemble"]["f1_score"],
                "segments_found": seg_metrics["n_clusters"],
                "forecast_models": len(forecast_metrics["models_trained"]),
                "models_reloaded": reload_status,
                "backup_location": str(backup_dir),
            },
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Retraining failed")
        # Restore backup on failure
        backup_dir = settings.MODEL_DIR / "backup"
        if backup_dir.exists():
            for f in backup_dir.glob("*.joblib"):
                shutil.copy2(f, settings.MODEL_DIR / f.name)
            ml_service.reload_models()
            logger.info("Restored backup models after training failure")
        raise HTTPException(status_code=500, detail=f"Retraining failed: {str(e)}")


@router.post("/restore-defaults")
def restore_default_models():
    """Restore backed-up models (e.g. revert to Olist-trained defaults)."""
    backup_dir = settings.MODEL_DIR / "backup"
    if not backup_dir.exists() or not list(backup_dir.glob("*.joblib")):
        raise HTTPException(status_code=404, detail="No backup models found.")

    for f in backup_dir.glob("*.joblib"):
        shutil.copy2(f, settings.MODEL_DIR / f.name)
    backup_metrics = backup_dir / "metrics.json"
    if backup_metrics.exists():
        shutil.copy2(backup_metrics, settings.MODEL_DIR / "metrics.json")

    reload_status = ml_service.reload_models()
    return {
        "success": True,
        "message": "Default models restored and reloaded.",
        "data": {"models_reloaded": reload_status},
    }


@router.get("/metrics")
def get_training_metrics():
    """Get saved evaluation metrics from the last training run."""
    metrics_file = settings.MODEL_DIR / "metrics.json"
    if not metrics_file.exists():
        raise HTTPException(status_code=404, detail="No metrics found. Train models first.")
    with open(metrics_file, "r", encoding="utf-8") as f:
        metrics = json.load(f)
    return {"success": True, "data": metrics}


@router.get("/data-format")
def get_expected_data_format():
    """Return the expected CSV column format for retraining."""
    return {
        "success": True,
        "data": {
            "required_columns": {
                "order_status": "Order outcome: 'delivered', 'canceled', 'returned', etc.",
                "order_purchase_timestamp": "Order date (ISO format or parseable date string)",
                "payment_value": "Total order amount (numeric)",
                "customer_unique_id": "Unique customer identifier",
            },
            "optional_columns": {
                "customer_state": "Region/wilaya identifier (improves regional analysis)",
                "product_category_name": "Product category (improves category-level forecasting)",
                "order_estimated_delivery_date": "Estimated delivery date (improves risk features)",
                "product_weight_g": "Product weight in grams (improves logistics risk)",
                "order_item_id": "Item count per order (if multiple rows per order)",
                "payment_type": "Payment method: credit_card, boleto/cod, debit_card, voucher",
                "payment_installments": "Number of payment installments",
                "product_photos_qty": "Number of product photos",
                "product_description_lenght": "Product description length (characters)",
                "product_name_lenght": "Product name length (characters)",
                "product_length_cm": "Product length in cm (for volume calculation)",
                "product_height_cm": "Product height in cm",
                "product_width_cm": "Product width in cm",
                "seller_state": "Seller region/state (for geographic matching)",
            },
            "notes": [
                "CSV must be UTF-8 encoded",
                "Minimum 100 orders recommended for meaningful training",
                "Monetary values should be in your local currency (DZD)",
                "Previous models are automatically backed up before retraining",
                "Enhanced features (payment type, product quality, geography) significantly improve risk prediction AUC",
            ],
        },
    }


def _prepare_custom_data(df: pd.DataFrame) -> pd.DataFrame:
    """Transform a raw custom CSV into the format expected by the training pipeline."""
    import numpy as np

    # Normalize column names
    df.columns = df.columns.str.strip().str.lower()

    # Order date
    date_col = None
    for col in ["order_purchase_timestamp", "order_date", "date", "created_at"]:
        if col in df.columns:
            date_col = col
            break
    if date_col:
        df["order_date"] = pd.to_datetime(df[date_col], errors="coerce")
    else:
        df["order_date"] = pd.Timestamp.now()

    # Status → is_delivered and order_status
    status_col = None
    for col in ["order_status", "status"]:
        if col in df.columns:
            status_col = col
            break
    if status_col:
        df["order_status"] = df[status_col].str.lower().str.strip()
        delivered_keywords = ["delivered", "livree", "livré", "completed", "done", "success"]
        df["is_delivered"] = df["order_status"].apply(
            lambda s: 1 if any(k in str(s) for k in delivered_keywords) else 0
        )
    else:
        df["order_status"] = "delivered"
        df["is_delivered"] = 1

    # Payment / total amount
    has_subtotal = "subtotal" in df.columns
    for col in ["payment_value", "total_amount", "amount", "price", "total"]:
        if col in df.columns:
            df["total_amount"] = pd.to_numeric(df[col], errors="coerce").fillna(0)
            if not has_subtotal:
                df["subtotal"] = df["total_amount"]
            else:
                df["subtotal"] = pd.to_numeric(df["subtotal"], errors="coerce").fillna(df["total_amount"])
            break
    else:
        df["total_amount"] = 0
        if not has_subtotal:
            df["subtotal"] = 0

    # Customer
    for col in ["customer_unique_id", "customer_id", "client_id", "phone"]:
        if col in df.columns:
            df["customer_unique_id"] = df[col].astype(str)
            break
    else:
        df["customer_unique_id"] = range(len(df))

    # Region
    if "customer_state" not in df.columns:
        for col in ["wilaya", "region", "state", "city"]:
            if col in df.columns:
                df["customer_state"] = df[col].astype(str)
                break
        else:
            df["customer_state"] = "default"

    # Product category
    if "product_category" not in df.columns:
        for col in ["product_category_name", "category", "product_type"]:
            if col in df.columns:
                df["product_category"] = df[col].astype(str).fillna("unknown")
                break
        else:
            df["product_category"] = "unknown"

    # Numeric defaults
    df["shipping_cost"] = pd.to_numeric(df.get("shipping_cost", df.get("freight_value", 0)), errors="coerce").fillna(400)
    df["n_items"] = pd.to_numeric(df.get("n_items", df.get("order_item_id", 1)), errors="coerce").fillna(1).astype(int)
    df["avg_product_weight"] = pd.to_numeric(df.get("product_weight_g", 1000), errors="coerce").fillna(1000) / 1000

    if "order_estimated_delivery_date" in df.columns:
        df["estimated_delivery_days"] = (
            pd.to_datetime(df["order_estimated_delivery_date"], errors="coerce") - df["order_date"]
        ).dt.days.clip(lower=1).fillna(7)
    else:
        df["estimated_delivery_days"] = 7

    # Payment features
    if "payment_type" in df.columns:
        pt = df["payment_type"].str.lower().str.strip()
        df["has_boleto"] = pt.isin(["boleto", "cod", "cash_on_delivery"]).astype(int)
        df["has_credit_card"] = pt.isin(["credit_card", "credit"]).astype(int)
        df["has_voucher"] = (pt == "voucher").astype(int)
        df["has_debit_card"] = pt.isin(["debit_card", "debit"]).astype(int)
    else:
        df["has_boleto"] = 0
        df["has_credit_card"] = 1
        df["has_voucher"] = 0
        df["has_debit_card"] = 0
    df["n_payment_methods"] = pd.to_numeric(df.get("n_payment_methods", 1), errors="coerce").fillna(1).astype(int)
    df["max_installments"] = pd.to_numeric(df.get("payment_installments", df.get("max_installments", 1)), errors="coerce").fillna(1).astype(int)

    # Product quality features
    df["avg_photos"] = pd.to_numeric(df.get("product_photos_qty", df.get("avg_photos", 1)), errors="coerce").fillna(1)
    df["avg_desc_length"] = pd.to_numeric(df.get("product_description_lenght", df.get("avg_desc_length", 500)), errors="coerce").fillna(500)
    df["avg_name_length"] = pd.to_numeric(df.get("product_name_lenght", df.get("avg_name_length", 30)), errors="coerce").fillna(30)

    # Product volume
    length = pd.to_numeric(df.get("product_length_cm", 0), errors="coerce").fillna(0)
    height = pd.to_numeric(df.get("product_height_cm", 0), errors="coerce").fillna(0)
    width = pd.to_numeric(df.get("product_width_cm", 0), errors="coerce").fillna(0)
    df["avg_volume"] = length * height * width
    df.loc[df["avg_volume"] == 0, "avg_volume"] = 10000

    # Geography features
    if "seller_state" in df.columns:
        df["seller_customer_same_state"] = (df["customer_state"] == df["seller_state"]).astype(int)
    else:
        df["seller_customer_same_state"] = 0
    df["n_sellers"] = pd.to_numeric(df.get("n_sellers", 1), errors="coerce").fillna(1).astype(int)

    # Order ID
    if "order_id" not in df.columns:
        df["order_id"] = range(len(df))

    # Customer history
    df = df.sort_values("order_date")
    cust_stats = df[df["is_delivered"] == 1].groupby("customer_unique_id").agg(
        customer_order_count=("order_id", "count"),
        customer_total_spent=("total_amount", "sum"),
    ).reset_index()
    df = df.merge(cust_stats, on="customer_unique_id", how="left")
    df["customer_order_count"] = df["customer_order_count"].fillna(0).astype(int)
    df["customer_total_spent"] = df["customer_total_spent"].fillna(0)
    df["is_repeat_customer"] = (df["customer_order_count"] > 1).astype(int)

    df.dropna(subset=["order_date"], inplace=True)

    logger.info(f"Custom data prepared: {len(df)} orders, delivery rate: {df['is_delivered'].mean():.1%}")
    return df
