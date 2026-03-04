"""API routes for serving endpoint / model listing."""

import asyncio
from fastapi import APIRouter, HTTPException
from server.llm import list_serving_endpoints

router = APIRouter(prefix="/api/models", tags=["models"])


@router.get("")
async def api_list_models():
    """List available serving endpoints."""
    try:
        endpoints = await asyncio.to_thread(list_serving_endpoints)
        return {"models": endpoints}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
