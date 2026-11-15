"""Step 4b – synthetic SAMPLE data for the spacewalk and back-on-Earth screens.

Every parameter comes from the `synthetic_data` sheet (rows "tomas (sample)" and
"iris (sample)") and the limits from `measurement_ranges`. Noise: AR(1), phi = 0.5,
seed 7 (guide section 6). Everything written here has is_synthetic = yes.

Spacewalk (tomas, EVA day, one sample every 2 min):
  suit_pressure       4.3 psi,  SD 0.03
  suit_co2            1.5 mmHg, SD 0.5; hour 4 = 3.5 mmHg (yellow)
  heart_rate          95 bpm,   SD 12;  hour 4 = 125 bpm (yellow)
  eva_time_remaining  420 min, −1 min per min
  Duration: 6.5 h (390 min), so the end leaves 30 min = the EMU reserve (S09).
  [UNVERIFIED] "hour 4" is read as minutes 240–298 at the event value.
  [UNVERIFIED] suit CO2 drift "rises with workload": no workload data, not modelled.

Back on Earth (iris, days 1–14 after landing, 08:00):
  orthostatic_sys_drop  25 mmHg, SD 4, falls linearly to 8 by day 10 (then 8)
  heart_rate            76 bpm,  SD 5, falls linearly to 66 by day 14
  sleep                 7.2 h,   SD 0.6, no drift
  day 1: dizziness symptom entry
"""
import numpy as np
import pandas as pd

from common import OUTPUT as OUT, ar1_noise

PHI, SEED = 0.5, 7

# ---------------------------------------------------------------- spacewalk
def generate_eva(seed=SEED):
    rng = np.random.default_rng(seed)
    minute = np.arange(0, 391, 2)
    n = len(minute)
    hour4 = (minute >= 240) & (minute < 300)
    pressure = 4.3 + ar1_noise(n, 0.03, PHI, rng)
    co2 = np.clip(1.5 + ar1_noise(n, 0.5, PHI, rng), 0, None)
    hr = 95 + ar1_noise(n, 12, PHI, rng)
    co2[hour4] = 3.5
    hr[hour4] = 125
    df = pd.DataFrame({
        "person": "tomas (sample)",
        "location": "spacewalk",
        "minute": minute,
        "suit_pressure": pressure.round(2),
        "suit_co2": co2.round(1),
        "heart_rate": hr.round(0).astype(int),
        "eva_time_remaining": 420 - minute,
        "event": np.where(hour4, "hour 4 workload peak (synthetic_data)", ""),
        "is_synthetic": "yes",
        "source": "S01; S11; S08; S03; S09",
        "evidence_level": "demo (synthetic)",
    })
    return df


# ---------------------------------------------------------------- back on Earth
def generate_earth(seed=SEED):
    rng = np.random.default_rng(seed)
    day = np.arange(1, 15)
    n = len(day)
    drop_trend = np.where(day <= 10, 25 + (8 - 25) * (day - 1) / 9, 8)
    hr_trend = 76 + (66 - 76) * (day - 1) / 13
    drop = np.clip(drop_trend + ar1_noise(n, 4, PHI, rng), 0, None)
    hr = hr_trend + ar1_noise(n, 5, PHI, rng)
    sleep = 7.2 + ar1_noise(n, 0.6, PHI, rng)
    df = pd.DataFrame({
        "person": "iris (sample)",
        "location": "back_on_earth",
        "day_after_landing": day,
        "time": "08:00",
        "orthostatic_sys_drop": drop.round(0).astype(int),
        "heart_rate": hr.round(0).astype(int),
        "sleep": sleep.round(1),
        "symptom": np.where(day == 1, "dizziness", ""),
        "is_synthetic": "yes",
        "source": "S48; S49",
        "evidence_level": "demo (synthetic)",
    })
    return df


if __name__ == "__main__":
    eva = generate_eva()
    earth = generate_earth()
    eva.to_csv(OUT / "synthetic_spacewalk.csv", index=False)
    earth.to_csv(OUT / "synthetic_back_on_earth.csv", index=False)
    print("spacewalk:", len(eva), "samples, every 2 min, 0–390 min")
    print(eva[["minute", "suit_pressure", "suit_co2", "heart_rate", "eva_time_remaining"]].describe().round(2).to_string())
    print("\nback on Earth:")
    print(earth[["day_after_landing", "orthostatic_sys_drop", "heart_rate", "sleep", "symptom"]].to_string(index=False))
