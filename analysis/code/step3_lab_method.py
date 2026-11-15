"""STEP 3 - Lab method on the REAL Inspiration4 data (guide 3.2, 3.3 and 8.3).

For each crew member and test:
  baseline   = mean of the pre-flight results L-92, L-44, L-3
  % change   = (post value - baseline) / baseline × 100   for R+1, R+45, R+82, R+194
  flag       = |% change| > RCV (from lab_tests.csv), when an RCV exists
  IL-6, CCL2 = flagged when above the person's own pre-flight range (max of the 3 pre-flight values)
  NLR        = neutrophils % / lymphocytes %   (same as absolute / absolute, both divide by WBC)
Data quality: when ≥3 of the 4 crew are outside the lab range on the same side at the same time
point, it is treated as a sample-handling question, not an alarm (glucose at R+45).
Writes output/lab_analysis.csv and output/lab_data_quality.csv
"""
import numpy as np
import pandas as pd

from common import OUTPUT, PRE_FLIGHT, POST_FLIGHT, TIMEPOINT_ORDER, save_csv

lab = pd.read_csv(OUTPUT / "lab_results.csv", keep_default_na=False, na_values=[""])
tests = pd.read_csv(OUTPUT / "lab_tests.csv").set_index("test_id")
lab["quality_flag"] = lab["quality_flag"].fillna("")
use = lab[~lab.quality_flag.str.startswith("excluded")].copy()

# ---- NLR (derived) -------------------------------------------------------
pct = use[use.test_id.isin(["neutrophils", "lymphocytes"]) & (use.panel == "CBC")]
w = pct.pivot_table(index=["crew_id", "timepoint", "day_from_launch"], columns="test_id", values="value").reset_index()
w["value"] = (w.neutrophils / w.lymphocytes).round(3)
nlr = w[["crew_id", "timepoint", "day_from_launch", "value"]].assign(
    test_id="nlr", unit="ratio", panel="CBC (derived)", ref_low=np.nan, ref_high=np.nan, quality_flag="")
use = pd.concat([use, nlr], ignore_index=True)

# ---- cohort-wide data-quality pattern ------------------------------------
dq_rows = []
rng = use[use.ref_low.notna() | use.ref_high.notna()].copy()
rng["side"] = np.where(rng.value < rng.ref_low, "low", np.where(rng.value > rng.ref_high, "high", ""))
for (t, tp), g in rng.groupby(["test_id", "timepoint"]):
    for side in ("low", "high"):
        n = int((g.side == side).sum())
        if n >= 3 and tp in POST_FLIGHT:
            nxt = POST_FLIGHT[POST_FLIGHT.index(tp) + 1] if tp != POST_FLIGHT[-1] else None
            back = None
            if nxt:
                gn = rng[(rng.test_id == t) & (rng.timepoint == nxt)]
                back = int((gn.side == side).sum()) == 0
            dq_rows.append({"test_id": t, "timepoint": tp, "side": side, "crew_outside": n,
                            "crew_total": g.crew_id.nunique(),
                            "crew_ids": ";".join(sorted(g[g.side == side].crew_id)),
                            "back_in_range_next_timepoint": {True: "yes", False: "no", None: "n/a"}[back],
                            "next_timepoint": nxt or "",
                            "message": ("check sample handling – not an alarm" if back else
                                        "cohort-wide pattern – no later sample to confirm; review"),
                            "source": "S79; S02", "evidence_level": "real (values); demo (rule)"})
dq = pd.DataFrame(dq_rows)
save_csv(dq, "lab_data_quality.csv")
dq_keys = {(r.test_id, r.timepoint, c): r.message for r in dq.itertuples() for c in r.crew_ids.split(";")}

# ---- baseline + % change -------------------------------------------------
PRE_RANGE_TESTS = {"il_6", "mcp_1"}
out = []
for (crew, t), g in use.groupby(["crew_id", "test_id"]):
    g = g.set_index("timepoint")
    pre = g.loc[g.index.intersection(PRE_FLIGHT), "value"]
    if len(pre) == 0:
        continue
    base = pre.mean()
    rcv = tests.rcv_pct.get(t, np.nan)
    direction = tests.concern_direction.get(t, "")
    for tp in [x for x in POST_FLIGHT if x in g.index]:
        v = g.loc[tp, "value"]
        chg = (v - base) / base * 100 if base else np.nan
        exceeds = bool(pd.notna(rcv) and abs(chg) > rcv)
        concern = exceeds and ((direction == "up" and chg > 0) or (direction == "down" and chg < 0) or direction == "both")
        above_pre = bool(t in PRE_RANGE_TESTS and v > pre.max())
        lo, hi = g.loc[tp, "ref_low"], g.loc[tp, "ref_high"]
        out_lab = ("low" if pd.notna(lo) and v < lo else "high" if pd.notna(hi) and v > hi else "")
        if (t, tp, crew) in dq_keys:
            status = "data quality – " + dq_keys[(t, tp, crew)]
        elif concern:
            status = "change > RCV (concern direction)"
        elif exceeds:
            status = "change > RCV (other direction)"
        elif above_pre:
            status = "above pre-flight range"
        elif out_lab:
            status = f"outside lab range ({out_lab})"
        else:
            status = "within expected variation" if pd.notna(rcv) or t in PRE_RANGE_TESTS else "no RCV – shown only"
        out.append({"crew_id": crew, "test_id": t, "unit": g.unit.iloc[0], "panel": g.panel.iloc[0],
                    "baseline_mean": round(base, 4), "baseline_n": len(pre),
                    "pre_min": pre.min(), "pre_max": pre.max(), "timepoint": tp,
                    "day_from_launch": int(g.loc[tp, "day_from_launch"]), "value": v,
                    "pct_change": round(chg, 1), "rcv_pct": rcv, "exceeds_rcv": "yes" if exceeds else "no",
                    "above_pre_range": "yes" if above_pre else ("no" if t in PRE_RANGE_TESTS else ""),
                    "out_of_lab_range": out_lab, "status": status,
                    "is_real": "yes",
                    "source": "S78" if g.panel.iloc[0].startswith("CBC") else "S79",
                    "evidence_level": "real (values); demo (method)"})
res = pd.DataFrame(out)
save_csv(res, "lab_analysis.csv")

# ---- print the key results -----------------------------------------------
KEY = ["white_blood_cell_count", "absolute_neutrophils", "absolute_lymphocytes", "nlr", "crp", "il_6", "mcp_1"]
k = res[res.test_id.isin(KEY)].copy()
k["shown"] = k.apply(lambda r: f"{r['pct_change']:+.0f}%" + ("*" if r.status.startswith(("change", "above")) else ""), axis=1)
tab = k.pivot_table(index=["test_id", "crew_id"], columns="timepoint", values="shown", aggfunc="first")[POST_FLIGHT]
print("% change vs own pre-flight mean  (* = > RCV or above pre-flight range)")
print(tab.to_string())
print("\nBaseline n (pre-flight values used):",
      res[res.test_id.isin(KEY)].groupby(["test_id", "crew_id"]).baseline_n.first().unstack().to_string())
crp = res[res.test_id == "crp"][["crew_id", "timepoint", "value", "baseline_mean", "pct_change", "status"]].copy()
crp["value_mg_per_l"] = (crp.value / 1e6).round(2)
crp["baseline_mg_per_l"] = (crp.baseline_mean / 1e6).round(2)
print("\nCRP (mg/L):\n", crp[["crew_id", "timepoint", "baseline_mg_per_l", "value_mg_per_l", "pct_change", "status"]].to_string(index=False))
print("\nCohort-wide data-quality cases:\n", dq.drop(columns=["source", "evidence_level"]).to_string(index=False))
print("\nStatus counts (all tests):\n", res.status.value_counts().to_string())
