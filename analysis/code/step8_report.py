"""STEP 8 - Report for the flight surgeon as JSON (guide 3.5 and report_template.csv).

Sections in the order of report_template.csv. Size is measured on the compact JSON that would be
queued for the downlink. Writes:
  maia_report.json          compact (what the app sends)   + maia_report_pretty.json (easy to read)
  maia_lab_real.json        REAL Inspiration4 lab results for the app's lab screen
"""
import json
import sys

import numpy as np
import pandas as pd

from common import OUTPUT, XLSX, POST_FLIGHT

MISSION_DAY = int(sys.argv[1]) if len(sys.argv) > 1 else 42   # the app shows "today = day 42"

tpl = pd.read_excel(XLSX, sheet_name="report_template").sort_values("order")
status = pd.read_csv(OUTPUT / "daily_status.csv")
changes = pd.read_csv(OUTPUT / "daily_changes.csv")
bands = pd.read_csv(OUTPUT / "daily_bands.csv").set_index("measurement_id")
events = pd.read_csv(OUTPUT / "events.csv")
co2 = pd.read_csv(OUTPUT / "cabin_co2_daily.csv")
immune = pd.read_csv(OUTPUT / "immune_timeline.csv", keep_default_na=False)
inflight = pd.read_csv(OUTPUT / "immune_inflight_labs.csv")
ranges = pd.read_excel(XLSX, sheet_name="measurement_ranges")

ranges = ranges[(ranges.location == "iss") & (ranges.applies_to == "all")].set_index("measurement_id")
# keep only what is known on the report day
status = status[status.day <= MISSION_DAY]
co2 = co2[co2.day <= MISSION_DAY]
immune = immune[immune.day.astype(int) <= MISSION_DAY]
events = events[events.day <= MISSION_DAY]
inflight = inflight[inflight.day <= MISSION_DAY]
changes = changes[changes.detection_day <= MISSION_DAY].copy()
changes["last_day"] = changes.last_day.clip(upper=MISSION_DAY)
UNITS = {"heart_rate": "bpm", "bp_systolic": "mmHg", "bp_diastolic": "mmHg", "spo2": "%", "temperature": "°C",
         "sleep": "h", "cabin_co2": "mmHg"}


def num(x, nd=2):
    return None if pd.isna(x) else round(float(x), nd)


# ---------------------------------------------------------------- 1 header
banded = status[status.measurement_id.isin(bands.index)]
completeness = round(banded.value.notna().mean() * 100, 1)
header = {"crew_member": "lucia (sample)", "location": "iss", "mission_day": MISSION_DAY,
          "report_period_days": [1, MISSION_DAY], "data_completeness_pct": completeness,
          "data_label": "sample – synthetic daily data", "disclaimer": "supports decision, not a diagnosis"}

# ---------------------------------------------------------------- 2 ordered changes
items = []
for r in changes.itertuples():
    items.append({"type": "marked_change", "measurement": r.measurement_id, "direction": r.side,
                  "level": "caution", "first_day_outside": int(r.first_out_day), "detected_day": int(r.detection_day),
                  "last_day": int(r.last_day), "days_outside_of_6": int(r.max_n_of_6),
                  "size_vs_band_robust_sd": num(r.max_size_robust_sd), "confidence": r.confidence,
                  "note": ("expected spaceflight rise (Stahn 2017) – review, not fever by default"
                           if r.measurement_id == "temperature" else "")})
rv = immune[immune.immune_review != ""]
if len(rv):
    peak = immune.n_domains.max()
    items.append({"type": "immune_review", "measurement": "immune (4 domains)", "direction": "",
                  "level": "caution", "first_day_outside": int(rv.day.min()), "detected_day": int(rv.day.min()),
                  "last_day": int(rv.day.max()), "domains_positive_max": int(peak),
                  "domains": [d for d in ("cellular", "inflammatory", "viral", "clinical")
                              if (immune[d] == "positive").any() and
                              (immune.loc[immune.n_domains == peak, d] == "positive").any()],
                  "confidence": "medium", "size_vs_band_robust_sd": None,
                  "note": "rule: ≥2 domains in 14 days (DEMO, not clinical)"})
LEVEL = {"red": 0, "warning": 0, "caution": 1, "advisory": 2}
CONF = {"high": 0, "medium": 1, "low": 2}
items.sort(key=lambda x: (LEVEL[x["level"]], CONF[x["confidence"]], -(x["size_vs_band_robust_sd"] or 0)))
# reference-limit alerts (counted, not marked changes)
ref_alerts = []
for m, g in status.groupby("measurement_id"):
    n_red = int((g.ref_status == "red").sum())
    if n_red:
        ref_alerts.append({"measurement": m, "red_days": n_red, "days": g[g.ref_status == "red"].day.tolist()})
co2_red = co2[co2.hours_over_3 > 0]
ref_alerts.append({"measurement": "cabin_co2", "red_days": int(len(co2_red)), "days": co2_red.day.tolist(),
                   "rule": "1-h value > 3 mmHg", "event_days": [d for d in [52] if d <= MISSION_DAY]})

# ---------------------------------------------------------------- 3 evidence
evidence = []
for it in items:
    if it["type"] == "marked_change":
        m = it["measurement"]
        d = it["detected_day"]
        s = status[(status.measurement_id == m) & status.day.between(d - 6, d)]
        r = ranges.loc[m]
        evidence.append({"measurement": m, "unit": UNITS[m], "days": s.day.tolist(),
                         "values": [num(v, 1) for v in s.value],
                         "band": [num(bands.loc[m, "band_low"]), num(bands.loc[m, "band_high"])],
                         "reference": {"green": [num(r.ref_green_min), num(r.ref_green_max)],
                                       "red_below": num(r.ref_red_below), "red_above": num(r.ref_red_above)}})
    else:
        evidence.append({"measurement": "immune", "blood_day": int(inflight.day.iloc[0]),
                         "labs": [{"test": r.test_id, "value": num(r.value, 2), "baseline": num(r.baseline_mean, 2),
                                   "change_pct": num(r.pct_change, 1), "rcv_pct": num(r.rcv_pct, 1),
                                   "result_age_days": MISSION_DAY - int(r.day)} for r in inflight.itertuples()],
                         "baseline_source": "REAL pre-flight C002 (OSD-569)",
                         "viral": "saliva EBV positive day 35", "clinical": "rash photo day 41",
                         "inflammatory": "no in-flight result"})

# ---------------------------------------------------------------- 4 data quality
miss = status[status.band_side == "missing"].groupby("measurement_id").day.apply(list).to_dict()
data_quality = {"missing_days": miss,
                "stale_readings": status[status.stale].groupby("measurement_id").day.apply(list).to_dict(),
                "sensor_gaps": [], "artefacts_removed": [],
                "learning_window": "days 8–21 (days 1–7 skipped: adaptation)",
                "bands_ready": {m: bool(bands.loc[m, "band_ready"]) for m in bands.index}}

# ---------------------------------------------------------------- 5 overlapping events
overlap = []
for it in items:
    lo, hi = it["first_day_outside"] - 1, it["last_day"] + 1
    for e in events[events.kind == "event"].itertuples():
        if lo <= e.day <= hi:
            overlap.append({"change": it["measurement"], "event": e.id, "day": int(e.day)})

# ---------------------------------------------------------------- 6 symptoms
symptoms = [{"day": int(r.day), "symptom": r.id, "severity": None, "note": r.description}
            for r in events[events.kind == "symptom"].itertuples()]
if bool(co2.air_quality_rule.any()):
    symptoms.append({"day": int(co2[co2.air_quality_rule].day.iloc[0]), "symptom": "combined rule air_quality",
                     "severity": None, "note": "cabin CO₂ ≥ 3 mmHg + headache → yellow"})

# ---------------------------------------------------------------- assemble
section_data = {
    "Header": header, "Ordered changes": {"changes": items, "reference_limit_alerts": ref_alerts},
    "Evidence": evidence, "Data quality": data_quality, "Overlapping events": overlap,
    "Symptoms": symptoms, "Incident timeline": [], "Astronaut note": "", "Send": {},
}
report = {"report": "Maia flight-surgeon report", "is_synthetic": True, "label": "sample",
          "generated_for_mission_day": MISSION_DAY, "sections": []}
for r in tpl.itertuples():
    report["sections"].append({"order": int(r.order), "section": r.section, "priority_rule": r.priority_rule,
                               "data": section_data[r.section]})


def size_kb(obj):
    return len(json.dumps(obj, ensure_ascii=False, separators=(",", ":"), allow_nan=False).encode("utf-8")) / 1024


# fill the Send section with the final size (iterate once so the number includes itself)
send = report["sections"][-1]["data"]
send.update({"status": "queued for next downlink", "size_kb": 0.0,
             "estimate_kb_report_template": float(tpl.approx_kb.sum())})
for _ in range(3):
    send["size_kb"] = round(size_kb(report), 2)
OUT_NAME = sys.argv[2] if len(sys.argv) > 2 else "maia_report.json"   # past reports use another name
(OUTPUT / OUT_NAME).write_text(json.dumps(report, ensure_ascii=False, separators=(",", ":"), allow_nan=False), encoding="utf-8")
if OUT_NAME == "maia_report.json":
    (OUTPUT / "maia_report_pretty.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

# ---------------------------------------------------------------- real lab JSON
la = pd.read_csv(OUTPUT / "lab_analysis.csv")
dq = pd.read_csv(OUTPUT / "lab_data_quality.csv")
real_dom = pd.read_csv(OUTPUT / "immune_domains_real_postflight.csv", keep_default_na=False)
KEY = ["white_blood_cell_count", "absolute_neutrophils", "absolute_lymphocytes", "nlr", "crp", "il_6", "mcp_1", "glucose"]
k = la[la.test_id.isin(KEY)]
lab_json = {"dataset": "NASA OSDR OSD-569 / OSD-575 – Inspiration4", "is_real": True,
            "caveat": "4 civilian crew, 3-day flight, no in-flight blood",
            "method": "each post-flight value vs mean of own L-92, L-44, L-3; flag if |change| > RCV",
            "crew": {}}
for crew, g in k.groupby("crew_id"):
    lab_json["crew"][crew] = {t: {"unit": gg.unit.iloc[0], "baseline": num(gg.baseline_mean.iloc[0], 3),
                                  "baseline_n": int(gg.baseline_n.iloc[0]),
                                  "post": [{"timepoint": r.timepoint, "value": num(r.value, 3),
                                            "change_pct": num(r.pct_change, 1), "status": r.status}
                                           for r in gg.set_index("timepoint").loc[[x for x in POST_FLIGHT if x in set(gg.timepoint)]].reset_index().itertuples()]}
                              for t, gg in g.groupby("test_id")}
lab_json["data_quality"] = json.loads(dq.drop(columns=["source", "evidence_level"]).to_json(orient="records", force_ascii=False))
lab_json["immune_rule_on_real_data"] = json.loads(real_dom[real_dom.immune_review != ""][["crew_id", "timepoint", "cellular",
                                                                               "inflammatory"]].to_json(orient="records", force_ascii=False))
(OUTPUT / "maia_lab_real.json").write_text(json.dumps(lab_json, ensure_ascii=False, separators=(",", ":"), allow_nan=False), encoding="utf-8")

print("Report sections:", [s["section"] for s in report["sections"]])
print("Ordered changes:")
for it in items:
    print(f"   {it['level']:8s} {it['confidence']:6s} {it['measurement']:20s} detected day {it['detected_day']}  "
          f"size {it['size_vs_band_robust_sd']}")
print("Reference-limit red days:", {a["measurement"]: a["red_days"] for a in ref_alerts})
print(f"Data completeness: {completeness}%")
print(f"maia_report.json size: {send['size_kb']} KB (report_template estimate: {send['estimate_kb_report_template']} KB)")
print(f"maia_lab_real.json size: {size_kb(lab_json):.2f} KB")
