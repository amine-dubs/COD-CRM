from fastapi import APIRouter, HTTPException, Query, Depends

from app.services.ml_service import ml_service
from app.middleware.auth import verify_api_key

router = APIRouter(dependencies=[Depends(verify_api_key)])


@router.get("/customers")
def get_customer_segments():
    """Get customer segmentation results."""
    try:
        result = ml_service.get_customer_segments()
        return {"success": True, "data": result}
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))


@router.get("/summary")
def get_segment_summary():
    """Get summary statistics per customer segment."""
    try:
        result = ml_service.get_segment_summary()
        return {"success": True, "data": result}
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
