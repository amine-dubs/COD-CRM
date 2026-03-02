from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from app.models.predictor import OrderRiskPredictor
from app.services.ml_service import ml_service

router = APIRouter()


class OrderRiskRequest(BaseModel):
    """Order data for risk prediction."""
    order_id: Optional[int] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    wilaya_id: Optional[int] = None
    customer_state: Optional[str] = None
    commune: Optional[str] = None
    subtotal: float = 0
    shipping_cost: float = 0
    total_amount: float = 0
    n_items: int = 1
    product_category: Optional[str] = None
    order_date: Optional[str] = None
    is_repeat_customer: bool = False
    customer_order_count: int = 0
    customer_total_spent: float = 0
    estimated_delivery_days: float = 7
    avg_product_weight: float = 1.0
    # Payment features
    payment_method: Optional[str] = None
    has_boleto: Optional[int] = None
    has_credit_card: Optional[int] = None
    has_voucher: Optional[int] = None
    has_debit_card: Optional[int] = None
    n_payment_methods: int = 1
    max_installments: int = 1
    # Product quality features
    avg_photos: float = 1.0
    avg_desc_length: float = 500.0
    avg_name_length: float = 30.0
    avg_volume: float = 10000.0
    # Geography features
    seller_customer_same_state: int = 0
    n_sellers: int = 1


class BatchRiskRequest(BaseModel):
    orders: list[OrderRiskRequest]


@router.post("/order-risk")
def predict_order_risk(request: OrderRiskRequest):
    """Predict delivery risk for a single order."""
    try:
        result = ml_service.predict_order_risk(request.model_dump())
        return {"success": True, "data": result}
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))


@router.post("/order-risk/batch")
def predict_batch_risk(request: BatchRiskRequest):
    """Predict delivery risk for multiple orders."""
    try:
        results = ml_service.predict_batch_risk([o.model_dump() for o in request.orders])
        return {"success": True, "data": results}
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))


@router.get("/model-info")
def model_info():
    """Get information about the loaded prediction model."""
    return {
        "success": True,
        "data": {
            "model_loaded": ml_service.predictor._loaded,
            "features": ml_service.predictor.feature_engineer.get_feature_names() if ml_service.predictor._loaded else [],
            "n_features": len(ml_service.predictor.feature_engineer.get_feature_names()) if ml_service.predictor._loaded else 0,
            "optimal_threshold": ml_service.predictor.optimal_threshold if ml_service.predictor._loaded else 0.5,
        },
    }
