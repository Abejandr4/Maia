"""Port of the reference project's Express dataset router to FastAPI.

GET  /api/dataset/keys
POST /api/dataset/refresh
GET  /api/dataset                 (everything, raw)
GET  /api/dataset/{key}?field=x&field__gte=3 …  (same filter syntax as the original)
"""

from __future__ import annotations

import re
from typing import Any

from fastapi import APIRouter, HTTPException, Request

from ..loader import DatasetLoader

router = APIRouter(prefix="/api/dataset", tags=["dataset"])

IGNORED = {"page", "pageSize", "limit", "offset"}
OP_RE = re.compile(r"^([A-Za-z0-9_.]+)__(contains|gte|lte|ne)$")


def ok(data: Any, message: str, meta: Any = None) -> dict:
    return {"success": True, "message": message, "data": data, "meta": meta}


@router.get("/keys")
async def keys():
    return ok(DatasetLoader.keys(), "Dataset keys loaded")


@router.post("/refresh")
async def refresh():
    loaded = await DatasetLoader.reload()
    return ok(None, "Datasets reloaded", {k: v.meta() for k, v in loaded.items()})


@router.get("")
async def all_data(request: Request):
    loaded = await DatasetLoader.load_all()
    data = {k: apply_filters(v.data, dict(request.query_params)) for k, v in loaded.items()}
    return ok(data, "Complete dataset loaded", {k: v.meta() for k, v in loaded.items()})


@router.get("/{key}")
async def by_key(key: str, request: Request):
    if key not in DatasetLoader.keys():
        raise HTTPException(404, detail={"code": "DATASET_NOT_FOUND", "message": f"Dataset '{key}' is not available"})
    loaded = await DatasetLoader.load(key)
    return ok(apply_filters(loaded.data, dict(request.query_params)), f"Dataset '{key}' loaded", loaded.meta())


def apply_filters(data: Any, query: dict[str, str]) -> Any:
    """field=value · field__contains=x · field__gte=n · field__lte=n · field__ne=x
    Dot paths work (allKpIndex.0.kpIndex). Arrays keep matching items;
    objects are returned only if they match."""
    filters = []
    for raw_key, value in query.items():
        if raw_key in IGNORED:
            continue
        m = OP_RE.match(raw_key)
        filters.append((m.group(1), m.group(2), value) if m else (raw_key, "eq", value))
    if not filters:
        return data

    def get(obj: Any, path: str) -> Any:
        cur = obj
        for part in path.split("."):
            if isinstance(cur, dict):
                cur = cur.get(part)
            elif isinstance(cur, list) and part.isdigit() and int(part) < len(cur):
                cur = cur[int(part)]
            else:
                return None
        return cur

    def matches(item: Any) -> bool:
        if not isinstance(item, dict):
            return False
        for field, op, value in filters:
            actual = get(item, field)
            if actual is None:
                return False
            a, needle = str(actual).lower(), value.lower()
            if op == "eq" and a != needle:
                return False
            if op == "ne" and a == needle:
                return False
            if op == "contains" and needle not in a:
                return False
            if op in ("gte", "lte"):
                try:
                    x, n = float(actual), float(value)
                except ValueError:
                    return False
                if (op == "gte" and x < n) or (op == "lte" and x > n):
                    return False
        return True

    if isinstance(data, list):
        return [d for d in data if matches(d)]
    if isinstance(data, dict) and all(isinstance(v, list) for v in data.values()):
        # e.g. donki = {"SEP": [...], "FLR": [...]} → filter each list
        return {k: [d for d in v if matches(d)] for k, v in data.items()}
    return data if matches(data) else None
