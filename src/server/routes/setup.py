"""Setup/discovery routes — used by the settings panel to populate dropdowns."""

import asyncio
from fastapi import APIRouter, HTTPException
from server.config import get_workspace_client

router = APIRouter(prefix="/api/setup", tags=["setup"])


@router.get("/catalogs")
async def list_catalogs():
    """List Unity Catalog catalogs the service principal can see."""
    try:
        w = get_workspace_client()
        catalogs = await asyncio.to_thread(lambda: [c.name for c in w.catalogs.list()])
        return {"catalogs": sorted(catalogs)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/schemas")
async def list_schemas(catalog: str):
    """List schemas within a catalog."""
    try:
        w = get_workspace_client()
        schemas = await asyncio.to_thread(
            lambda: [s.name for s in w.schemas.list(catalog_name=catalog)]
        )
        return {"schemas": sorted(schemas)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/warehouses")
async def list_warehouses():
    """List SQL warehouses available in the workspace."""
    try:
        w = get_workspace_client()
        warehouses = await asyncio.to_thread(
            lambda: [
                {"id": wh.id, "name": wh.name}
                for wh in w.warehouses.list()
                if wh.id and wh.name
            ]
        )
        return {"warehouses": sorted(warehouses, key=lambda x: x["name"])}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
