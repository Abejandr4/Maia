"""STEP 5 - Daily method on the synthetic demo data (guide 3.1, 3.3, 3.4).

Writes: daily_bands.csv, daily_status.csv, daily_changes.csv, daily_artefacts.csv, cabin_co2_daily.csv
"""
import pandas as pd

from common import OUTPUT, save_csv
from daily_method import analyze, co2_checks, load_settings

settings = load_settings()
daily = pd.read_csv(OUTPUT / "daily_synthetic.csv")
hourly = pd.read_csv(OUTPUT / "hourly_cabin_co2.csv")
events = pd.read_csv(OUTPUT / "events.csv")

status, changes, bands, artefacts = analyze(daily, events, settings)
co2 = co2_checks(hourly, events, settings)
for df, name in [(bands, "daily_bands.csv"), (status, "daily_status.csv"), (changes, "daily_changes.csv"),
                 (artefacts, "daily_artefacts.csv"), (co2, "cabin_co2_daily.csv")]:
    df = df.copy()
    df["is_synthetic"] = "yes"
    df["source"] = "S56; S57; S02; S48"
    df["evidence_level"] = "demo"
    save_csv(df, name)

pd.set_option("display.width", 200)
print("BANDS learned on days 8–21:")
print(bands.to_string(index=False))
print("\nMARKED CHANGES (≥4 of last 6 days outside the band, same side):")
print(changes.to_string(index=False) if len(changes) else "none")
print("\nREFERENCE-LIMIT status, days 1–60 (count of days):")
print(status.pivot_table(index="measurement_id", columns="ref_status", values="day", aggfunc="count", fill_value=0))
st = status[status.stale]
print("\nSTALE readings:", "none" if st.empty else st[["measurement_id", "day", "days_since_reading"]].to_string(index=False))
miss = status[status.band_side == "missing"]
print("MISSING days:", miss.groupby("measurement_id").day.apply(list).to_dict())
print("ARTEFACTS removed:", "none" if artefacts.empty else artefacts.to_string(index=False))
print("\nCABIN CO₂: days with any 1-h value > 3 mmHg:")
print(co2[co2.hours_over_3 > 0][["day", "mean", "max_1h", "hours_over_3", "air_quality_rule"]].to_string(index=False))
print("days with 7-day mean ≥ 2.5 mmHg:", int(co2.mean_7d_over_green.sum()))
