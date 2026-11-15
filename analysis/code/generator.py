"""Synthetic daily generator (guide section 6) – every value here is SAMPLE data.

value = personal baseline + drift(day) + AR(1) noise (phi = 0.5, DEMO)

Parameters come from guide section 6 and synthetic_data.csv (sheet `synthetic_data`).
Injected events (DEMO, guide section 6 + rows of synthetic_data.csv):
  day 30  solar event (replay of 10 May 2024)               -> event marker only
  day 33  schedule shift: sleep −2 h for 3 nights (33–35)
  days 33, 35–38  heart rate +14 bpm                        -> should give a marked change
  days 20–22  blood pressure missing (sensor off)
  day 40  sleep 2 h ; day 41 HR +12 bpm, BP 128/82          -> single days (synthetic_data.csv rows 0,1,2,5)
  day 45  spacewalk (EVA)                                    -> event marker only
  day 52  cabin CO₂ 4.0 mmHg for 6 h + headache entry
           (CO₂ is generated per day, SD 0.4; only the day-52 event is hourly)
  immune storyline (4.4): EBV day 35 (saliva_samples.csv), blood day 40, rash day 41
"""
import numpy as np
import pandas as pd

from common import ar1_noise

DAYS = np.arange(1, 61)          # synthetic_data.csv: days 1–60
PHI = 0.5                        # guide section 6, DEMO

# baseline, sd, rounding decimals, source id (guide section 6 table)
PARAMS = {
    "heart_rate":   dict(baseline=62.0, sd=4.0, dec=0, source="S66; S48", level="estimate (baseline); demo"),
    "bp_systolic":  dict(baseline=116.0, sd=6.0, dec=0, source="S66; S48", level="estimate (baseline); demo"),
    "bp_diastolic": dict(baseline=74.0, sd=4.0, dec=0, source="S66; S92; S48", level="disputed (drift); demo"),
    "temperature":  dict(baseline=36.6, sd=0.2, dec=1, source="S21; S48", level="estimate (drift); demo"),
    "sleep":        dict(baseline=6.0, sd=0.7, dec=1, source="S40; S96", level="consensus (mean); demo"),
    "spo2":         dict(baseline=98.0, sd=1.0, dec=0, source="S48", level="[UNVERIFIED]; demo"),
}
CO2 = dict(baseline=2.2, sd=0.4, source="S05", level="consensus (range); demo")
RAD_DAILY_MSV = 0.4              # guide section 6 (synthetic_data.csv says +0.5 – conflict, guide wins)
RAD_START_PCT = 18.0             # synthetic_data.csv baseline (% of 600 mSv career limit) [UNVERIFIED source]
CAREER_LIMIT_MSV = 600.0         # [V1 4030]

EVENTS = [  # day, type, description
    (30, "solar_event", "Solar particle event replay (10 May 2024, S2, 149 pfu)"),
    (33, "schedule_shift", "Schedule shift: sleep −2 h for 3 nights"),
    (45, "eva", "Spacewalk (EVA)"),
    (52, "co2_peak", "Cabin CO₂ 4.0 mmHg for 6 h"),
]
SYMPTOMS = [  # day, symptom id (symptoms.csv), note
    (52, "headache", "logged with the CO₂ peak (guide section 6); severity not given [UNVERIFIED]"),
    (41, "rash", "rash photo (immune storyline 4.4); severity not given [UNVERIFIED]"),
]
# injected changes used by the evaluation (step 7)
INJECTED = [
    dict(change_id="hr_plus14", measurement="heart_rate", side="high", start=33, end=38,
         days=[33, 35, 36, 37, 38], size_sd=14 / 4, description="HR +14 bpm on days 33, 35–38"),
    dict(change_id="sleep_minus2", measurement="sleep", side="low", start=33, end=35,
         days=[33, 34, 35], size_sd=2 / 0.7, description="Sleep −2 h for 3 nights (schedule shift)"),
    dict(change_id="temp_drift", measurement="temperature", side="high", start=1, end=60,
         days=list(range(1, 61)), size_sd=None, description="Temperature +1.0 °C linear over 75 days"),
    dict(change_id="single_days_40_41", measurement="heart_rate|bp_systolic|bp_diastolic|sleep", side="any",
         start=40, end=41, days=[40, 41], size_sd=None,
         description="Single-day values (sleep 2 h day 40; HR +12, BP 128/82 day 41) – should NOT alarm"),
]


def temperature_drift(day):
    """+1.0 °C linear over 75 days, plateau after day 75 (Stahn 2017)."""
    return np.minimum(day, 75) / 75 * 1.0


def generate(seed=7, scenario="demo", phi=PHI, with_co2=True, shift=None):
    """Return (daily, hourly_co2). scenario='demo' adds drift + events; 'null' = baseline + noise only.

    shift = (measurement, size_in_sd, first_day, last_day) adds a sustained shift (used by the evaluation).
    """
    rng = np.random.default_rng(seed)
    n = len(DAYS)
    rows = []
    for m, p in PARAMS.items():
        v = p["baseline"] + ar1_noise(n, p["sd"], phi, rng)
        note = [""] * n
        if scenario == "demo":
            if m == "temperature":
                v = v + temperature_drift(DAYS)
            if m == "heart_rate":
                for d in (33, 35, 36, 37, 38):
                    v[d - 1] += 14
                    note[d - 1] = "injected +14 bpm"
                v[41 - 1] += 12
                note[41 - 1] = "injected +12 bpm (synthetic_data.csv)"
            if m == "sleep":
                for d in (33, 34, 35):
                    v[d - 1] -= 2
                    note[d - 1] = "schedule shift −2 h"
                v[40 - 1] = 2.0
                note[40 - 1] = "set to 2 h (synthetic_data.csv)"
            if m == "bp_systolic":
                v[41 - 1] = 128
                note[41 - 1] = "set to 128 (synthetic_data.csv)"
            if m == "bp_diastolic":
                v[41 - 1] = 82
                note[41 - 1] = "set to 82 (synthetic_data.csv)"
            if m in ("bp_systolic", "bp_diastolic"):
                for d in (20, 21, 22):
                    v[d - 1] = np.nan
                    note[d - 1] = "missing (sensor off)"
        if shift and shift[0] == m:
            v[shift[2] - 1:shift[3]] += shift[1] * p["sd"]
        v = np.round(v, p["dec"])
        if m == "spo2":
            v = np.minimum(v, 100)
        for i, d in enumerate(DAYS):
            rows.append(dict(person="lucia (sample)", location="iss", day=int(d), measurement_id=m,
                             value=v[i], note=note[i], is_synthetic="yes",
                             source=p["source"], evidence_level=p["level"]))
    # radiation: cumulative % of career limit (no noise: no SD given)
    pct = RAD_START_PCT + np.cumsum(np.full(n, RAD_DAILY_MSV)) / CAREER_LIMIT_MSV * 100
    for i, d in enumerate(DAYS):
        rows.append(dict(person="lucia (sample)", location="iss", day=int(d), measurement_id="radiation_dose",
                         value=round(pct[i], 4), note="0.4 mSv/day; solar-event dose not cited -> not added",
                         is_synthetic="yes", source="S06; S93", evidence_level="estimate; demo"))
    daily = pd.DataFrame(rows)
    if not with_co2:
        return daily, None

    # cabin CO2: one value per day (SD 0.4 = day-to-day variation, team decision Nov 14 – [UNVERIFIED]).
    # The hourly table repeats the day's value for every hour; only the day-52 event is hour by hour.
    co2_day = CO2["baseline"] + ar1_noise(n, CO2["sd"], phi, rng)
    co2_day = np.round(np.clip(co2_day, 0, None), 2)
    hours = np.arange(n * 24)
    co2 = np.repeat(co2_day, 24)
    if scenario == "demo":
        idx = (52 - 1) * 24 + np.arange(10, 16)   # 6 h at 4.0 mmHg on day 52 (10:00–15:59)
        co2[idx] = 4.0
    hourly = pd.DataFrame(dict(person="lucia (sample)", location="iss", day=hours // 24 + 1, hour=hours % 24,
                               measurement_id="cabin_co2", value=co2, is_synthetic="yes",
                               source=CO2["source"], evidence_level=CO2["level"]))
    # daily CO2 summary rows (mean and max of 1-h values)
    g = hourly.groupby("day").value
    co2_daily = pd.DataFrame(dict(person="lucia (sample)", location="iss", day=g.mean().index.astype(int),
                                  measurement_id="cabin_co2", value=g.mean().round(2).values,
                                  note=[f"daily value (SD 0.4 day to day); max 1-h = {mx}" for mx in g.max().values],
                                  is_synthetic="yes", source=CO2["source"], evidence_level=CO2["level"]))
    daily = pd.concat([daily, co2_daily], ignore_index=True)
    return daily, hourly
