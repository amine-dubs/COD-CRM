"""API Key authentication middleware for ML service.

In development (ML_API_KEY not set), all requests are allowed.
In production, requests must include either:
  - Header: X-API-Key: <key>
  - Header: Authorization: Bearer <key>
"""

from fastapi import HTTPException, Security, status
from fastapi.security import APIKeyHeader, HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional

from app.config import settings

# Security schemes
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)
bearer_scheme = HTTPBearer(auto_error=False)


async def verify_api_key(
    api_key: Optional[str] = Security(api_key_header),
    bearer: Optional[HTTPAuthorizationCredentials] = Security(bearer_scheme),
) -> str:
    """Verify API key from header.
    
    Accepts either X-API-Key header or Authorization: Bearer token.
    In development (ML_API_KEY empty), authentication is disabled.
    
    Returns:
        The validated API key or "dev" if auth is disabled.
        
    Raises:
        HTTPException: 401 if key is missing or invalid in production.
    """
    # If no API key configured, skip auth (development mode)
    if not settings.ML_API_KEY:
        return "dev"
    
    # Check X-API-Key header first
    if api_key and api_key == settings.ML_API_KEY:
        return api_key
    
    # Check Bearer token
    if bearer and bearer.credentials == settings.ML_API_KEY:
        return bearer.credentials
    
    # No valid credentials provided
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or missing API key. Provide X-API-Key header or Authorization: Bearer token.",
        headers={"WWW-Authenticate": "Bearer"},
    )
