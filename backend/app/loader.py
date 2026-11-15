"""DatasetLoader — the "local reliable dataset" layer.

Every dataset is read in this order:
  1. memory cache, if younger than its TTL
  2. the live API (and the answer is saved to data/cache/<key>.json)
  3. data/cache/<key>.json  — the last good live answer
  4. data/seed/<key>.json   — a snapshot committed to the repo

So the app never breaks during a demo with bad wifi: it just reports
`source: "cache"` or `"seed"` instead of `"live"`.
"""

from __future__ import annotations

import json
import time
from dataclasses import dataclass
from typing import Any, Awaitable, Callable

from . import config

Fetcher = Callable[[], Awaitable[Any]]


@dataclass
class Loaded:
    key: str
    data: Any
    source: str          # "live" | "cache" | "seed"
    fetched_at: float    # unix seconds when this data was obtained
    error: str | None = None

    def meta(self) -> dict:
        return {
            "key": self.key,
            "source": self.source,
            "fetchedAt": int(self.fetched_at * 1000),
            "ageSeconds": round(time.time() - self.fetched_at),
            "error": self.error,
        }


class DatasetLoader:
    _memory: dict[str, Loaded] = {}
    _fetchers: dict[str, tuple[Fetcher, int]] = {}

    @classmethod
    def register(cls, key: str, fetcher: Fetcher, ttl: int) -> None:
        cls._fetchers[key] = (fetcher, ttl)

    @classmethod
    def keys(cls) -> list[str]:
        return list(cls._fetchers)

    @classmethod
    async def load(cls, key: str, force: bool = False) -> Loaded:
        if key not in cls._fetchers:
            raise KeyError(key)
        fetcher, ttl = cls._fetchers[key]

        hit = cls._memory.get(key)
        if hit and not force and hit.source == "live" and time.time() - hit.fetched_at < ttl:
            return hit

        error = None
        if not config.OFFLINE:
            try:
                data = await fetcher()
                loaded = Loaded(key, data, "live", time.time())
                cls._memory[key] = loaded
                _write_json(config.CACHE_DIR / f"{key}.json", {"fetchedAt": loaded.fetched_at, "data": data})
                return loaded
            except Exception as exc:  # network down, rate limit, bad JSON…
                error = f"{type(exc).__name__}: {exc}"[:300]
        else:
            error = "OFFLINE=1"

        # Fallbacks
        cached = _read_json(config.CACHE_DIR / f"{key}.json")
        if cached is not None:
            loaded = Loaded(key, cached["data"], "cache", cached["fetchedAt"], error)
        else:
            seed = _read_json(config.SEED_DIR / f"{key}.json")
            if seed is None:
                raise RuntimeError(f"No live data, cache or seed for '{key}' ({error})")
            seed_time = (config.SEED_DIR / f"{key}.json").stat().st_mtime
            loaded = Loaded(key, seed, "seed", seed_time, error)
        cls._memory[key] = loaded
        return loaded

    @classmethod
    async def load_all(cls) -> dict[str, Loaded]:
        return {k: await cls.load(k) for k in cls._fetchers}

    @classmethod
    async def reload(cls) -> dict[str, Loaded]:
        cls._memory.clear()
        return {k: await cls.load(k, force=True) for k in cls._fetchers}


def _read_json(path) -> Any | None:
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return None


def _write_json(path, payload) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp")
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(payload, f)
    tmp.replace(path)
