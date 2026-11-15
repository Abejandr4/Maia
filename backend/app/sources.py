"""Raw fetchers for each external API. They return JSON exactly as served;
all cleaning happens in services/environment.py."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import httpx

from . import config
from .loader import DatasetLoader

TIMEOUT = httpx.Timeout(10.0)
HEADERS = {"User-Agent": "Maia-NASA-SpaceApps-2026 (student project)"}

NOAA = "https://services.swpc.noaa.gov"
DONKI = "https://api.nasa.gov/DONKI"
ISS = "https://api.wheretheiss.at/v1/satellites/25544"


async def _get(url: str, params: dict | None = None):
    async with httpx.AsyncClient(timeout=TIMEOUT, headers=HEADERS, follow_redirects=True) as client:
        r = await client.get(url, params=params)
        r.raise_for_status()
        return r.json()


def _donki_window(days: int = 30) -> dict:
    end = datetime.now(timezone.utc).date()
    start = end - timedelta(days=days)
    return {"startDate": start.isoformat(), "endDate": end.isoformat(), "api_key": config.NASA_API_KEY}


async def fetch_iss():
    return await _get(ISS)


async def fetch_noaa_scales():
    return await _get(f"{NOAA}/products/noaa-scales.json")


async def fetch_kp():
    return await _get(f"{NOAA}/products/noaa-planetary-k-index.json")


async def fetch_donki():
    """Solar energetic particles, flares and geomagnetic storms, last 30 days."""
    window = _donki_window()
    return {
        "SEP": await _get(f"{DONKI}/SEP", window) or [],
        "FLR": await _get(f"{DONKI}/FLR", window) or [],
        "GST": await _get(f"{DONKI}/GST", window) or [],
    }


def register_all() -> None:
    DatasetLoader.register("iss", fetch_iss, config.TTL["iss"])
    DatasetLoader.register("spaceWeather", fetch_noaa_scales, config.TTL["spaceWeather"])
    DatasetLoader.register("kp", fetch_kp, config.TTL["kp"])
    DatasetLoader.register("donki", fetch_donki, config.TTL["donki"])
