import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

NASA_API_KEY = os.getenv("NASA_API_KEY", "DEMO_KEY")
OFFLINE = os.getenv("OFFLINE", "0") == "1"

SEED_DIR = BASE_DIR / "data" / "seed"     # committed, always there (demo fallback)
CACHE_DIR = BASE_DIR / "data" / "cache"   # last good live response, written at runtime

# How long a live response is reused before calling the API again (seconds).
# Kept generous so DEMO_KEY's rate limit and NOAA's servers are respected.
TTL = {
    "iss": 10,
    "spaceWeather": 5 * 60,   # NOAA scales
    "kp": 15 * 60,
    "donki": 60 * 60,
}

FRONTEND_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"]
