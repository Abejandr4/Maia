"""EnvironmentService — the "processes & enriches data" layer.

Turns raw NOAA / DONKI / ISS JSON into the small, app-shaped objects the
React Environment page needs, using the same status words as the UI
(normal / advisory / caution / warning / critical).
"""

from __future__ import annotations

from typing import Any

from ..loader import DatasetLoader

# ---------------------------------------------------------------- helpers

S_SCALE_TEXT = {
    0: "Quiet",
    1: "Minor radiation storm",
    2: "Moderate radiation storm",
    3: "Strong radiation storm",
    4: "Severe radiation storm",
    5: "Extreme radiation storm",
}


def _status_from_scale(level: int) -> str:
    return ["normal", "advisory", "caution", "warning", "critical", "critical"][max(0, min(level, 5))]


def _int(v: Any, default: int = 0) -> int:
    try:
        return int(float(v))
    except (TypeError, ValueError):
        return default


def _float(v: Any) -> float | None:
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


# ---------------------------------------------------------------- NOAA scales

def parse_noaa_scales(raw: dict) -> dict:
    """noaa-scales.json: {"0": {...today/current...}, "1": {...}, ...}
    each with R / S / G blocks holding a "Scale" value ("0".."5" or null)."""
    if not isinstance(raw, dict):
        raw = {}
    current = raw.get("0") or next(iter(raw.values()), {})

    def scale(block: str) -> int:
        return _int((current.get(block) or {}).get("Scale"), 0)

    r, s, g = scale("R"), scale("S"), scale("G")

    # Forecast blocks ("1".."3") carry probabilities for S1+ — keep the max.
    s_prob = 0
    for k in ("1", "2", "3"):
        s_prob = max(s_prob, _int(((raw.get(k) or {}).get("S") or {}).get("Prob"), 0))

    stamp = f"{current.get('DateStamp', '')} {current.get('TimeStamp', '')}".strip()
    return {
        "radiation": {"scale": s, "label": f"S{s}", "text": S_SCALE_TEXT.get(s, "Unknown"), "status": _status_from_scale(s)},
        "radioBlackout": {"scale": r, "label": f"R{r}", "status": _status_from_scale(r)},
        "geomagnetic": {"scale": g, "label": f"G{g}", "status": _status_from_scale(g)},
        "s1ProbabilityNext3Days": s_prob,
        "issuedAt": stamp or None,
    }


# ---------------------------------------------------------------- Kp index

def parse_kp(raw: list) -> list[dict]:
    """Accepts both formats NOAA has served:
    - array of arrays with a header row: [["time_tag","Kp",...], ["2026-...", "2.33", ...]]
    - array of objects: [{"time_tag": "...", "Kp": 2.33, ...}]"""
    if not isinstance(raw, list) or not raw:
        return []
    rows: list[dict] = []
    if isinstance(raw[0], list):
        header = [str(h) for h in raw[0]]
        rows = [dict(zip(header, r)) for r in raw[1:]]
    elif isinstance(raw[0], dict):
        rows = raw
    out = []
    for r in rows:
        kp = _float(r.get("Kp", r.get("kp_index", r.get("kp"))))
        t = r.get("time_tag") or r.get("time")
        if kp is not None and t:
            out.append({"time": t, "kp": kp})
    return out[-24:]  # last 3 days of 3-hour values


# ---------------------------------------------------------------- DONKI

def parse_donki(raw: dict) -> list[dict]:
    events: list[dict] = []
    for e in raw.get("SEP") or []:
        events.append({
            "id": e.get("sepID"),
            "type": "SEP",
            "title": "Solar energetic particle event",
            "time": e.get("eventTime"),
            "detail": ", ".join(i.get("displayName", "") for i in e.get("instruments") or [])[:120] or None,
            "status": "warning",
            "link": e.get("link"),
        })
    for e in raw.get("FLR") or []:
        cls = (e.get("classType") or "").upper()
        status = "warning" if cls.startswith("X") else "caution" if cls.startswith("M") else "advisory"
        events.append({
            "id": e.get("flrID"),
            "type": "FLR",
            "title": f"Solar flare {cls}".strip(),
            "time": e.get("peakTime") or e.get("beginTime"),
            "detail": e.get("sourceLocation"),
            "status": status,
            "link": e.get("link"),
        })
    for e in raw.get("GST") or []:
        kps = [_float(k.get("kpIndex")) for k in e.get("allKpIndex") or []]
        kmax = max([k for k in kps if k is not None], default=None)
        events.append({
            "id": e.get("gstID"),
            "type": "GST",
            "title": "Geomagnetic storm" + (f" · Kp {kmax:g}" if kmax is not None else ""),
            "time": e.get("startTime"),
            "detail": None,
            "status": "caution" if (kmax or 0) >= 7 else "advisory",
            "link": e.get("link"),
        })
    events = [e for e in events if e["time"]]
    events.sort(key=lambda e: e["time"], reverse=True)
    return events


# ---------------------------------------------------------------- ISS

def parse_iss(raw: dict) -> dict:
    return {
        "latitude": _float(raw.get("latitude")),
        "longitude": _float(raw.get("longitude")),
        "altitudeKm": _float(raw.get("altitude")),
        "velocityKmh": _float(raw.get("velocity")),
        "visibility": raw.get("visibility"),  # "daylight" | "eclipsed"
        "timestamp": raw.get("timestamp"),
        # Rough flag: the South Atlantic Anomaly box, where the ISS picks up extra dose
        "inSouthAtlanticAnomaly": _in_saa(_float(raw.get("latitude")), _float(raw.get("longitude"))),
    }


def _in_saa(lat: float | None, lon: float | None) -> bool:
    if lat is None or lon is None:
        return False
    return -50 <= lat <= 0 and -90 <= lon <= 40


# ---------------------------------------------------------------- service

class EnvironmentService:
    @staticmethod
    async def summary() -> dict:
        """One call for the whole Environment page."""
        loaded = await DatasetLoader.load_all()
        sw = parse_noaa_scales(loaded["spaceWeather"].data)
        kp = parse_kp(loaded["kp"].data)
        events = parse_donki(loaded["donki"].data)
        iss = parse_iss(loaded["iss"].data)

        latest_kp = kp[-1]["kp"] if kp else None
        recent_sep = [e for e in events if e["type"] == "SEP"]

        # Overall headline the UI shows next to the page title
        worst = max(
            (sw["radiation"]["status"], sw["geomagnetic"]["status"]),
            key=["normal", "advisory", "caution", "warning", "critical"].index,
        )
        return {
            "overall": {"status": worst, "label": "All within limits" if worst == "normal" else "Space weather active"},
            "spaceWeather": {**sw, "kp": latest_kp, "kpSeries": kp},
            "events": events[:12],
            "lastSep": recent_sep[0] if recent_sep else None,
            "iss": iss,
            "sources": {k: v.meta() for k, v in loaded.items()},
        }
