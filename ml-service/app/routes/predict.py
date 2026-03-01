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
    customer_phone_2: Optional[str] = None
    wilaya_id: Optional[int] = None
    customer_state: Optional[str] = None
    commune: Optional[str] = None
    subtotal: float = 0
    shipping_cost: float = 0
    discount: float = 0
    total_amount: float = 0
    n_items: int = 1
    product_category: Optional[str] = None
    source: Optional[str] = "manual"
    order_date: Optional[str] = None
    is_repeat_customer: bool = False
    customer_order_count: int = 0
    customer_success_rate: float = 0.5
    estimated_delivery_days: float = 7
    avg_product_weight: float = 1.0


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
            "risk_categories": list(OrderRiskPredictor.RISK_CATEGORIES.values()) if ml_service.predictor._loaded else [],
        },
    }
