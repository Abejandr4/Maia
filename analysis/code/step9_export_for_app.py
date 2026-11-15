"""STEP 9 - Export the results as JSON files the React app can import.

Creates output/app/ with:
  maia_report.json       report for the flight surgeon (step 8)
  maia_lab_real.json     REAL Inspiration4 lab results (step 3 and 6)
  maia_daily.json        daily series, bands, reference limits, marked changes, CO₂, events (synthetic)
  maia_immune.json       immune case: 14-day timeline, in-flight labs, saliva, rule on real data
  maia_evaluation.json   evaluation table (step 7)
  maia_targets.json      water / exercise / sleep goals
  maia_sources.json      every source id with reference and link (sources sheet + sources_added.csv)

If this folder sits inside the React project (Maia/analysis/code), the files are also copied to
Maia/src/data/generated/ automatically. You can also give the project folder:
    python step9_export_for_app.py /path/to/Maia
"""
import json
import shutil
import subprocess
import sys
from pathlib import Path

import pandas as pd

from common import OUTPUT, XLSX, ROOT

APP = OUTPUT / "app"
APP.mkdir(exist_ok=True)


def records(df):
    """DataFrame -> list of dicts with empty cells as null."""
    return json.loads(df.to_json(orient="records", force_ascii=False))


def write(name, obj):
    (APP / name).write_text(json.dumps(obj, ensure_ascii=False, separators=(",", ":"), allow_nan=False), encoding="utf-8")


# report + real labs: already JSON
shutil.copy(OUTPUT / "maia_report.json", APP / "maia_report.json")
shutil.copy(OUTPUT / "maia_lab_real.json", APP / "maia_lab_real.json")

# ---- past weekly reports (same method, earlier report day) ---------------------
past = []
(OUTPUT / "past").mkdir(exist_ok=True)
for day in (7, 14, 21, 28, 35):
    name = f"past/maia_report_D{day}.json"
    subprocess.run([sys.executable, str(Path(__file__).parent / "step8_report.py"), str(day), name],
                   check=True, capture_output=True)
    rep = json.loads((OUTPUT / name).read_text(encoding="utf-8"))
    sec = {x["section"]: x["data"] for x in rep["sections"]}
    ch = sec["Ordered changes"]["changes"]
    headline = ("; ".join(c["measurement"] for c in ch) if ch else
                "Learning your normal (days 8–21)" if day <= 21 else "No marked changes")
    past.append({"day": day, "headline": headline, "n_changes": len(ch),
                 "data_completeness_pct": sec["Header"]["data_completeness_pct"], "size_kb": sec["Send"]["size_kb"]})
write("maia_past_reports.json", list(reversed(past)))

# ---- daily ------------------------------------------------------------------
status = pd.read_csv(OUTPUT / "daily_status.csv")
status[["band_side", "marked_change"]] = status[["band_side", "marked_change"]].fillna("")
bands = pd.read_csv(OUTPUT / "daily_bands.csv")
changes = pd.read_csv(OUTPUT / "daily_changes.csv")
co2 = pd.read_csv(OUTPUT / "cabin_co2_daily.csv")
events = pd.read_csv(OUTPUT / "events.csv")
daily_raw = pd.read_csv(OUTPUT / "daily_synthetic.csv")
ranges = pd.read_excel(XLSX, sheet_name="measurement_ranges")
ranges = ranges[(ranges.location == "iss") & (ranges.applies_to == "all")]

series = {}
for m, g in status.groupby("measurement_id"):
    series[m] = records(g[["day", "value", "band_side", "ref_status", "marked_change", "stale", "phase"]]
                        .rename(columns={"band_side": "side"}))
rad = daily_raw[daily_raw.measurement_id == "radiation_dose"][["day", "value"]]
daily = {
    "person": "lucia (sample)", "location": "iss", "is_synthetic": True, "label": "sample",
    "learning_window_days": [8, 21],
    "bands": {r["measurement_id"]: {"low": r["band_low"], "high": r["band_high"], "median": r["median"],
                                    "robust_sd": r["robust_sd"], "ready": r["band_ready"]}
              for r in records(bands)},
    "reference": {r["measurement_id"]: {"green_min": r["ref_green_min"], "green_max": r["ref_green_max"],
                                        "red_below": r["ref_red_below"], "red_above": r["ref_red_above"],
                                        "source": r["source"]}
                  for r in records(ranges[["measurement_id", "ref_green_min", "ref_green_max", "ref_red_below",
                                           "ref_red_above", "source"]])},
    "series": series,
    "changes": records(changes.drop(columns=["is_synthetic", "source", "evidence_level"])),
    "cabin_co2": records(co2[["day", "mean", "max_1h", "hours_over_3", "mean_7d", "air_quality_rule"]]),
    "radiation_pct_of_career_limit": records(rad),
    "events": records(events[["day", "kind", "id", "description"]]),
    "solar_event_replay": records(pd.read_excel(XLSX, sheet_name="solar_event").head(2)
                                  [["date", "type", "intensity", "noaa_s_scale", "proton_flux_pfu", "source", "evidence_level"]]),
    "comm_policy": str(pd.read_excel(XLSX, sheet_name="contexts").set_index("id").loc["iss", "comm_policy"]),
    "co2_rules": records(pd.read_excel(XLSX, sheet_name="combined_rules").query("id in ['air_quality', 'co2_congestion']")
                         [["id", "condition_1", "condition_2", "result_color", "message", "source"]]),
}
write("maia_daily.json", daily)

tl = pd.read_csv(OUTPUT / "immune_timeline.csv", keep_default_na=False)

# ---- alerts derived from the analysis (texts from alert_types.csv) -------------
at = pd.read_excel(XLSX, sheet_name="alert_types").set_index("id")
LABEL = {"heart_rate": "Heart rate", "bp_systolic": "Blood pressure (top)", "bp_diastolic": "Blood pressure (bottom)",
         "spo2": "SpO₂", "temperature": "Temperature", "sleep": "Sleep"}


def alert(day, aid, measurement="", **kw):
    r = at.loc[aid]
    fill = {"measurement": LABEL.get(measurement, measurement), **{k: str(v) for k, v in kw.items()}}
    title, text = r.title, r.text
    for k, v in fill.items():
        title, text = title.replace("{" + k + "}", v), text.replace("{" + k + "}", v)
    return {"day": int(day), "alert_id": aid, "level": r.level, "title": title, "text": text,
            "measurement": measurement, "source": r.source}


alerts = []
for c in records(changes):
    alerts.append(alert(c["detection_day"], "marked_change", c["measurement_id"], n=c["max_n_of_6"]))
miss = status[status.band_side == "missing"].groupby("day").measurement_id.apply(list)
if len(miss):
    days_ = list(miss.index)
    alerts.append(alert(days_[-1], "data_missing", "blood pressure", days=len(days_)))
for e in records(events[events.kind == "event"]):
    if e["id"] == "solar_event":
        alerts.append(alert(e["day"], "solar_s2_plus"))
    else:
        alerts.append(alert(e["day"], "event_overlap", event=e["description"]))
rv = tl[tl.immune_review != ""]
if len(rv):
    alerts.append({"day": int(rv.day.min()), "alert_id": "immune_review", "level": "caution",
                   "title": "Immune stress – review",
                   "text": "2 or more immune domains positive within 14 days. Supports decision, not a diagnosis.",
                   "measurement": "immune", "source": "S83; S84; S86; S87 (rule: DEMO)"})
alerts.sort(key=lambda a: -a["day"])
write("maia_alerts.json", alerts)

# ---- daily routine (daily_routine.csv) for the Routine clock ------------------------
rt = pd.read_excel(XLSX, sheet_name="daily_routine")
rt["time"] = rt["time"].map(lambda t: t.strftime("%H:%M") if hasattr(t, "strftime") else str(t))
write("maia_routine.json", records(rt[["time", "task", "type", "measurement_id", "location", "source", "evidence_level"]]))

# ---- locations (contexts.csv) for the location menu --------------------------------
ctx = pd.read_excel(XLSX, sheet_name="contexts")
for c in ("description", "comm_policy"):
    ctx[c] = ctx[c].astype(str).str.replace("Spica", "Maia", regex=False)
write("maia_contexts.json", records(ctx[["id", "name", "status", "gravity", "comm_delay_label", "delay_one_way_min_s",
                                          "delay_one_way_max_s", "blackout_days_min", "blackout_days_max", "daily_dose_msv_min",
                                          "daily_dose_msv_max", "stricter_rules", "description", "comm_policy", "source",
                                          "evidence_level"]]))

# ---- spacewalk and back-on-Earth samples (step4b) + their limits (measurement_ranges) -----
from step4b_generate_eva_earth import generate_eva, generate_earth
mr = pd.read_excel(XLSX, sheet_name="measurement_ranges")
def limits(location):
    rows = mr[mr.location == location][["measurement_id", "ref_green_min", "ref_green_max",
                                        "ref_red_below", "ref_red_above", "notes", "source"]]
    return records(rows)
ctx = pd.read_excel(XLSX, sheet_name="contexts").set_index("id")
def ctx_text(cid):
    r = ctx.loc[cid]
    return {"description": r["description"], "comm_policy": r["comm_policy"], "source": r["source"]}
write("maia_spacewalk.json", {"samples": records(generate_eva()), "limits": limits("spacewalk"),
                              "context": ctx_text("spacewalk"), "is_synthetic": True,
                              "person": "tomas (sample)", "interval_min": 2, "duration_min": 390})
write("maia_earth.json", {"days": records(generate_earth()), "limits": limits("back_on_earth"),
                          "context": ctx_text("back_on_earth"), "is_synthetic": True,
                          "person": "iris (sample)"})

# ---- body zones and symptoms (body_zones.csv, symptoms.csv) for the body map ------------
bz = pd.read_excel(XLSX, sheet_name="body_zones")
write("maia_body_zones.json", records(bz))
sx = pd.read_excel(XLSX, sheet_name="symptoms")
write("maia_symptoms.json", records(sx))

# ---- plain-language texts per measurement (measurements.csv; old app name "Spica" -> "Maia") ----
ms = pd.read_excel(XLSX, sheet_name="measurements")
cols = ["id", "name", "unit", "why_it_matters", "what_to_do_yellow", "what_to_do_red", "source"]
meas = ms[cols].copy()
for c in ["why_it_matters", "what_to_do_yellow", "what_to_do_red"]:
    meas[c] = meas[c].astype(str).str.replace("Spica", "Maia", regex=False).replace("nan", None)
write("maia_measurements.json", {r["id"]: r for r in records(meas)})

# ---- immune -----------------------------------------------------------------
tl = pd.read_csv(OUTPUT / "immune_timeline.csv", keep_default_na=False)
immune = {
    "is_synthetic": True, "label": "sample", "window_days": 14,
    "baseline_crew": "C002 (REAL pre-flight L-92, L-44, L-3)",
    "timeline": records(tl[["day", "cellular", "inflammatory", "viral", "clinical", "n_domains",
                            "immune_review", "context"]]),
    "inflight_labs": records(pd.read_csv(OUTPUT / "immune_inflight_labs.csv")
                             [["day", "test_id", "value", "unit", "baseline_mean", "pct_change", "rcv_pct", "beyond_rcv"]]),
    "saliva": records(pd.read_csv(OUTPUT / "saliva_samples.csv")[["day", "virus", "result"]]),
    "domains": records(pd.read_csv(OUTPUT / "immune_domains.csv")[["domain", "condition", "window_days", "counts_alone"]]),
    "rule_on_real_postflight": records(pd.read_csv(OUTPUT / "immune_domains_real_postflight.csv", keep_default_na=False)
                                       [["crew_id", "timepoint", "cellular", "inflammatory", "n_domains", "immune_review"]]),
}
write("maia_immune.json", immune)

# ---- evaluation, targets, sources --------------------------------------------
ev = pd.read_csv(OUTPUT / "evaluation.csv")
write("maia_evaluation.json", records(ev.drop(columns=["is_synthetic"])))
write("maia_targets.json", records(pd.read_csv(OUTPUT / "targets.csv")))
src = pd.read_excel(XLSX, sheet_name="sources")[["id", "reference", "link"]]
src = pd.concat([src, pd.read_csv(OUTPUT / "sources_added.csv")[["id", "reference", "link"]]], ignore_index=True)
write("maia_sources.json", {r["id"]: {"reference": r["reference"], "link": r["link"]} for r in records(src)})

for f in sorted(APP.glob("*.json")):
    print(f"{f.name:24s} {f.stat().st_size / 1024:6.1f} KB")

# ---- copy into the React project ---------------------------------------------
project = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else ROOT.parent
if (project / "src").is_dir() and (project / "package.json").exists():
    dest = project / "src" / "data" / "generated"
    dest.mkdir(parents=True, exist_ok=True)
    for f in APP.glob("*.json"):
        shutil.copy(f, dest / f.name)
    print(f"\nCopied to {dest}")
else:
    print(f"\nNo React project found at {project} – files are only in {APP}")
