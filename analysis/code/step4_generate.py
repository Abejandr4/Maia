"""STEP 4 - Generate the synthetic daily data (guide section 6) for 'lucia (sample)' on the ISS.

Writes: daily_synthetic.csv, hourly_cabin_co2.csv, events.csv (events + symptom entries)
All rows: is_synthetic = yes.
"""
import pandas as pd

from common import XLSX, save_csv
from generator import generate, PARAMS, CO2, EVENTS, SYMPTOMS, PHI

SEED = 7  # fixed seed so the demo is reproducible

daily, hourly = generate(seed=SEED, scenario="demo")
save_csv(daily, "daily_synthetic.csv")
save_csv(hourly, "hourly_cabin_co2.csv")

ev = pd.DataFrame([dict(person="lucia (sample)", day=d, kind="event", id=t, description=s,
                        is_synthetic="yes", source="S53; S48" if t == "solar_event" else "S48",
                        evidence_level="demo") for d, t, s in EVENTS] +
                  [dict(person="lucia (sample)", day=d, kind="symptom", id=t, description=s,
                        is_synthetic="yes", source="S63" if t == "headache" else "S87; S48",
                        evidence_level="demo") for d, t, s in SYMPTOMS])
save_csv(ev.sort_values("day"), "events.csv")

# ---- cross-check generator parameters with synthetic_data.csv -------------
sd = pd.read_excel(XLSX, sheet_name="synthetic_data")
sd = sd[sd.person.str.startswith("lucia") & pd.to_numeric(sd.baseline, errors="coerce").notna()]
print("Parameter check (code vs synthetic_data.csv):")
for _, r in sd.iterrows():
    m = r.measurement_id
    p = PARAMS.get(m) or (CO2 if m == "cabin_co2" else None)
    if p is None:
        print(f"   {m:15s} sheet baseline={r.baseline}  (not banded here: handled separately)")
        continue
    ok = float(r.baseline) == p["baseline"] and float(r.sd) == p["sd"]
    print(f"   {m:15s} sheet {r.baseline}/{r.sd}  code {p['baseline']}/{p['sd']}  {'OK' if ok else 'DIFFERENT'}")
print(f"AR(1) phi = {PHI}, seed = {SEED}")

# ---- show the injected days ----------------------------------------------
w = daily.pivot_table(index="day", columns="measurement_id", values="value")
cols = ["heart_rate", "bp_systolic", "bp_diastolic", "sleep", "temperature", "spo2", "cabin_co2"]
print("\nDaily values around the injected events:")
print(w.loc[[18, 19, 20, 21, 22, 23, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 45, 51, 52, 53, 60], cols]
      .to_string())
print("\nHourly CO₂ day 52 (only the event is hour by hour):", hourly[hourly.day == 52].value.tolist())
print("\nRows:", len(daily), "daily |", len(hourly), "hourly | events/symptoms:", len(ev))
