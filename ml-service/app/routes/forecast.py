from typing import Optional

from fastapi import APIRouter, HTTPException, Query, Depends

from app.services.ml_service import ml_service
from app.middleware.auth import verify_api_key

router = APIRouter(dependencies=[Depends(verify_api_key)])


@router.get("/demand")
def forecast_demand(
    category: str = Query(default="all", description="Product category to forecast"),
    periods: int = Query(default=30, ge=1, le=90, description="Number of days to forecast"),
    start_date: Optional[str] = Query(
        default=None,
        description="Optional forecast start date (YYYY-MM-DD). Must be >= model default start.",
    ),
):
    """Get demand forecast for a product category."""
    try:
        result = ml_service.forecast_demand(
            category=category,
            periods=periods,
            start_date=start_date,
        )
        return {"success": True, "data": result}
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/categories")
def available_categories():
    """List product categories with available forecast models."""
    try:
        categories = ml_service.get_forecast_categories()
        return {"success": True, "data": {"categories": categories}}
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
