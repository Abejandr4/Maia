"""Daily method (guide 3.1, 3.3, 3.4) – used by step 5, 6, 7 and 8.

Band     : median ± k × robust SD, robust SD = MAD × 1.4826, k = 2.5 (measurement_ranges.csv)
           learned on flight days 8–21; needs ≥ 10 valid days; if MAD = 0 use min_band_halfwidth.
Rule     : marked change when ≥ 4 of the last 6 days are outside the band on the same side.
           Checked from day 22 (until day 21 only reference limits apply).
Missing  : a missing day never counts as normal and never counts toward 4 of 6.
Stale    : last valid reading older than stale_after_days (measurements.csv).
Artefacts: HR < 25 or > 250, SpO₂ < 50 removed and listed (data_quality_rules.csv, [UNVERIFIED] limits).
EVA day  : HR / temperature above band on an EVA day is shown, not counted (combined_rules.csv eva_day).
Events   : solar event, schedule shift, EVA, CO₂ peak within ±1 day are listed beside a change.
"""
import numpy as np
import pandas as pd

from common import XLSX

BANDED = ["heart_rate", "bp_systolic", "bp_diastolic", "spo2", "temperature", "sleep"]
IMPLAUSIBLE = {"heart_rate": (25, 250), "spo2": (50, None)}
LEARN = (8, 21)
MIN_VALID = 10
RUN_N, RUN_K = 6, 4
MAD_K = 1.4826


def load_settings():
    mr = pd.read_excel(XLSX, sheet_name="measurement_ranges")
    mr = mr[(mr.location == "iss") & (mr.applies_to == "all")].set_index("measurement_id")
    ms = pd.read_excel(XLSX, sheet_name="measurements").set_index("id")
    return mr, ms


def ref_status(v, r):
    """green / yellow / red against the reference limits of measurement_ranges.csv."""
    if pd.isna(v):
        return "missing"
    if pd.notna(r.ref_red_below) and v < r.ref_red_below:
        return "red"
    if pd.notna(r.ref_red_above) and v > r.ref_red_above:
        return "red"
    lo_ok = pd.isna(r.ref_green_min) or v >= r.ref_green_min
    hi_ok = pd.isna(r.ref_green_max) or v <= r.ref_green_max
    return "green" if lo_ok and hi_ok else "yellow"


def analyze(daily, events, settings=None, eva_days=(45,)):
    mr, ms = settings or load_settings()
    ev_days = {}
    for d, kind in zip(events.day, events.id):
        ev_days.setdefault(int(d), []).append(kind)

    day_rows, episodes, bands, artefacts = [], [], [], []
    for m in BANDED:
        if not (daily.measurement_id == m).any():
            continue
        s = daily[daily.measurement_id == m].set_index("day").value.astype(float).sort_index()
        # artefacts
        lo, hi = IMPLAUSIBLE.get(m, (None, None))
        bad = pd.Series(False, index=s.index)
        if lo is not None:
            bad |= s < lo
        if hi is not None:
            bad |= s > hi
        for d in s.index[bad]:
            artefacts.append(dict(measurement_id=m, day=int(d), value=s[d], action="removed"))
        s = s.mask(bad)
        r = mr.loc[m]
        k = float(r.band_k_robust_sd)
        learn = s.loc[LEARN[0]:LEARN[1]].dropna()
        med = learn.median()
        mad = (learn - med).abs().median()
        rsd = mad * MAD_K
        half = k * rsd if mad > 0 else float(r.min_band_halfwidth)
        has_band = len(learn) >= MIN_VALID
        band_lo, band_hi = (med - half, med + half) if has_band else (np.nan, np.nan)
        bands.append(dict(measurement_id=m, valid_learning_days=len(learn), median=round(med, 3),
                          mad=round(mad, 3), robust_sd=round(rsd, 3), halfwidth=round(half, 3),
                          band_low=round(band_lo, 3), band_high=round(band_hi, 3),
                          band_ready=bool(has_band), mad_zero=bool(mad == 0)))
        stale_after = float(ms.loc[m, "stale_after_days"])

        side = pd.Series("", index=s.index)
        if has_band:
            side[s > band_hi] = "high"
            side[s < band_lo] = "low"
        side[s.isna()] = "missing"
        # EVA rule: above band on EVA day is shown but not counted
        counted = side.copy()
        if m in ("heart_rate", "temperature"):
            for d in eva_days:
                if d in counted.index and counted[d] == "high":
                    counted[d] = "eva_shown"

        last_valid = None
        marked = pd.Series("", index=s.index)
        info = {}
        for d in s.index:
            if pd.notna(s[d]):
                last_valid = d
            age = (d - last_valid) if last_valid is not None else np.nan
            win = counted.loc[d - RUN_N + 1:d]
            nh, nl = int((win == "high").sum()), int((win == "low").sum())
            nmiss = int((win == "missing").sum())
            if has_band and d > LEARN[1]:
                if nh >= RUN_K:
                    marked[d] = "high"
                elif nl >= RUN_K:
                    marked[d] = "low"
            info[d] = (nh, nl, nmiss)
            day_rows.append(dict(day=int(d), measurement_id=m, value=s[d], band_low=band_lo, band_high=band_hi,
                                 band_side=side[d], ref_status=ref_status(s[d], r),
                                 days_since_reading=age, stale=bool(pd.notna(age) and age > stale_after),
                                 n_high_last6=nh, n_low_last6=nl, n_missing_last6=nmiss,
                                 marked_change=marked[d], phase=("adaptation (skipped)" if d < LEARN[0] else
                                                                 "learning window" if d <= LEARN[1] else
                                                                 "monitoring")))
        # episodes = consecutive days with the same marked side
        d_list = list(s.index)
        i = 0
        while i < len(d_list):
            d = d_list[i]
            if marked[d]:
                sd_ = marked[d]
                j = i
                while j + 1 < len(d_list) and marked[d_list[j + 1]] == sd_:
                    j += 1
                det, end = d, d_list[j]
                win_days = list(range(det - RUN_N + 1, det + 1))
                first_out = min(x for x in win_days if counted.get(x, "") == sd_)
                n_max = max(info[x][0] if sd_ == "high" else info[x][1] for x in d_list[i:j + 1])
                miss = sum(info[x][2] for x in d_list[i:j + 1]) > 0
                evs = sorted({f"{e} (day {x})" for x in range(first_out - 1, end + 2) for e in ev_days.get(x, [])})
                seg = s.loc[first_out:end]
                size = ((seg - med).abs().max() / rsd) if rsd > 0 else np.nan
                if miss:
                    conf = "low"
                elif n_max >= 5 and not evs:
                    conf = "high"
                else:
                    conf = "medium"
                episodes.append(dict(measurement_id=m, side=sd_, first_out_day=int(first_out),
                                     detection_day=int(det), last_day=int(end), max_n_of_6=n_max,
                                     max_size_robust_sd=round(size, 2), confidence=conf,
                                     overlapping_events="; ".join(evs), missing_in_window=miss))
                i = j + 1
            else:
                i += 1
    return (pd.DataFrame(day_rows), pd.DataFrame(episodes), pd.DataFrame(bands), pd.DataFrame(artefacts))


def co2_checks(hourly, events, settings=None):
    """Cabin CO₂ against reference limits: 1-h value > 3 mmHg (red), 7-day mean ≥ 2.5 (not green)."""
    mr, _ = settings or load_settings()
    r = mr.loc["cabin_co2"]
    red = float(r.ref_red_above)        # 3.0
    green_max = float(r.ref_green_max)  # 2.5
    h = hourly.copy()
    h["over_red"] = h.value > red
    h["ge_3"] = h.value >= red
    by_day = h.groupby("day").agg(mean=("value", "mean"), max_1h=("value", "max"), hours_over_3=("over_red", "sum"),
                                  hours_ge_3=("ge_3", "sum"))
    by_day["mean_7d"] = by_day["mean"].rolling(7, min_periods=7).mean()
    by_day["mean_7d_over_green"] = by_day.mean_7d >= green_max
    headache_days = set(events[events.id == "headache"].day)
    by_day["air_quality_rule"] = [(hrs > 0 and d in headache_days) for d, hrs in by_day.hours_ge_3.items()]
    return by_day.reset_index()
