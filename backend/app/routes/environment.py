from fastapi import APIRouter

from ..loader import DatasetLoader
from ..services.environment import EnvironmentService, parse_iss

router = APIRouter(prefix="/api/environment", tags=["environment"])


@router.get("/summary")
async def summary():
    """Everything the Environment page needs, already cleaned."""
    return await EnvironmentService.summary()


@router.get("/iss")
async def iss():
    """Light endpoint for frequent polling (ISS moves ~7.7 km/s)."""
    loaded = await DatasetLoader.load("iss")
    return {"iss": parse_iss(loaded.data), "source": loaded.meta()}
