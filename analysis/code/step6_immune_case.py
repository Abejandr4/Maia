"""STEP 6 - Immune case (guide 4.3 and 4.4): 4 domains, 14-day window.

Baseline : REAL pre-flight values (L-92, L-44, L-3) of crew C002 (OSD-569/575).
           C002 chosen because its lab reference ranges are the female ranges in every sample,
           matching 'lucia (sample)', a female profile [inference from ranges – UNVERIFIED].
In flight: SYNTHETIC blood on day 40 = baseline × 1.45 (neutrophils) and × 0.65 (lymphocytes) (guide 4.4, DEMO).
Rule     : "Immune stress – review" when ≥ 2 domains are positive within 14 days (immune_domains.csv).
Writes   : immune_inflight_labs.csv, immune_timeline.csv, immune_postflight_real.csv
"""
import numpy as np
import pandas as pd

from common import OUTPUT, PRE_FLIGHT, POST_FLIGHT, save_csv

CREW = "C002"
BLOOD_DAY = 40
STORY = {"absolute_neutrophils": 1.45, "absolute_lymphocytes": 0.65}   # guide 4.4 (DEMO size)

lab = pd.read_csv(OUTPUT / "lab_results.csv", keep_default_na=False, na_values=[""])
lab["quality_flag"] = lab.quality_flag.fillna("")
tests = pd.read_csv(OUTPUT / "lab_tests.csv").set_index("test_id")
domains = pd.read_csv(OUTPUT / "immune_domains.csv")
saliva = pd.read_csv(OUTPUT / "saliva_samples.csv")
events = pd.read_csv(OUTPUT / "events.csv")
changes = pd.read_csv(OUTPUT / "daily_changes.csv")
status = pd.read_csv(OUTPUT / "daily_status.csv")
analysis = pd.read_csv(OUTPUT / "lab_analysis.csv")
WIN = int(domains.loc[domains.domain == "cellular", "window_days"].iloc[0])  # 14

me = lab[(lab.crew_id == CREW) & ~lab.quality_flag.str.startswith("excluded")]
base = me[me.timepoint.isin(PRE_FLIGHT)].groupby("test_id").value.agg(["mean", "min", "max", "count"])

# ---- synthetic in-flight blood (day 40) ----------------------------------
inflight = []
for t, f in STORY.items():
    b = base.loc[t, "mean"]
    v = round(b * f)
    chg = (v - b) / b * 100
    rcv = tests.loc[t, "rcv_pct"]
    pos = (chg > rcv) if tests.loc[t, "concern_direction"] == "up" else (-chg > rcv)
    inflight.append(dict(person="lucia (sample)", day=BLOOD_DAY, test_id=t, value=v, unit="cells/µL",
                         baseline_mean=round(b, 1), baseline_from=f"{CREW} L-92, L-44, L-3 (REAL)",
                         pct_change=round(chg, 1), rcv_pct=rcv, beyond_rcv="yes" if pos else "no",
                         is_synthetic="yes", source="S78; S84; S48", evidence_level="demo (size); real (baseline)"))
n_b = base.loc["absolute_neutrophils", "mean"] / base.loc["absolute_lymphocytes", "mean"]
n_v = inflight[0]["value"] / inflight[1]["value"]
inflight.append(dict(person="lucia (sample)", day=BLOOD_DAY, test_id="nlr", value=round(n_v, 2), unit="ratio",
                     baseline_mean=round(n_b, 2), baseline_from=f"{CREW} (derived)",
                     pct_change=round((n_v - n_b) / n_b * 100, 1), rcv_pct=np.nan, beyond_rcv="no RCV – shown only",
                     is_synthetic="yes", source="S78; S48", evidence_level="demo"))
inflight = pd.DataFrame(inflight)
save_csv(inflight, "immune_inflight_labs.csv")

# ---- domain events per day ------------------------------------------------
pos_events = {"cellular": [], "inflammatory": [], "viral": [], "clinical": []}
for r in inflight[inflight.beyond_rcv == "yes"].itertuples():
    pos_events["cellular"].append((r.day, f"{r.test_id} {r.pct_change:+.0f}% (RCV {r.rcv_pct:.1f}%)"))
for r in saliva[saliva.result == "positive"].itertuples():
    pos_events["viral"].append((r.day, f"saliva {r.virus} positive"))
for r in events[events.id.isin(["rash"])].itertuples():
    pos_events["clinical"].append((r.day, "rash logged (photo)"))
fever = status[(status.measurement_id == "temperature") & (status.marked_change == "high")].day.tolist()
for d in fever:
    pos_events["clinical"].append((d, "fever: temperature marked change, high side"))
# inflammatory: no in-flight CRP / IL-6 / CCL2 in the storyline -> no data
context = []
for r in events[events.kind == "event"].itertuples():
    context.append((r.day, "schedule shift: sleep −2 h days 33–35" if r.id == "schedule_shift" else r.id))
low_sleep = status[(status.measurement_id == "sleep") & (status.marked_change == "low")].day.tolist()
context += [(d, "low sleep (marked change)") for d in low_sleep]

rows = []
for day in range(1, 61):
    lo = day - WIN + 1
    r = {"day": day}
    for dom, evs in pos_events.items():
        hits = [f"{txt} (day {d})" for d, txt in evs if lo <= d <= day]
        r[dom] = "positive" if hits else ("no data in flight" if dom == "inflammatory" else "negative")
        r[dom + "_evidence"] = "; ".join(hits)
    r["n_domains"] = sum(r[d] == "positive" for d in pos_events)
    r["immune_review"] = "Immune stress – review" if r["n_domains"] >= 2 else ""
    ctx = []
    for d, txt in context:
        w = 3 if txt == "eva" else WIN   # EVA counts only in the last 72 h
        if day - w + 1 <= d <= day:
            ctx.append(f"{txt} (day {d})")
    r["context"] = "; ".join(sorted(set(ctx)))
    r.update(is_synthetic="yes", source="S83; S84; S86; S87; S48", evidence_level="demo")
    rows.append(r)
tl = pd.DataFrame(rows)
save_csv(tl, "immune_timeline.csv")

# ---- REAL post-flight values of C002 (return toward baseline) ------------
KEY = ["white_blood_cell_count", "absolute_neutrophils", "absolute_lymphocytes", "nlr", "crp", "il_6", "mcp_1"]
post = analysis[(analysis.crew_id == CREW) & analysis.test_id.isin(KEY)][
    ["test_id", "timepoint", "day_from_launch", "value", "baseline_mean", "pct_change", "rcv_pct", "status"]].copy()
post["is_real"] = "yes"
post["source"] = "S78; S79"
post["evidence_level"] = "real (values); demo (method)"
save_csv(post, "immune_postflight_real.csv")

# ---- the same rule applied to the REAL post-flight data of all 4 crew ------
real_rows = []
for (crew, tp), g in analysis[analysis.timepoint.isin(POST_FLIGHT)].groupby(["crew_id", "timepoint"]):
    g = g.set_index("test_id")
    cell = [t for t in ("white_blood_cell_count", "absolute_neutrophils", "absolute_lymphocytes")
            if t in g.index and g.loc[t, "status"] == "change > RCV (concern direction)"]
    infl = [t for t in ("crp",) if t in g.index and g.loc[t, "status"] == "change > RCV (concern direction)"]
    infl += [t for t in ("il_6", "mcp_1") if t in g.index and g.loc[t, "status"] == "above pre-flight range"]
    n = (len(cell) > 0) + (len(infl) > 0)
    real_rows.append(dict(crew_id=crew, timepoint=tp, cellular="; ".join(cell) or "negative",
                          inflammatory="; ".join(infl) or "negative", viral="no data", clinical="no data",
                          n_domains=n, immune_review="Immune stress – review" if n >= 2 else "",
                          is_real="yes", source="S78; S79", evidence_level="real (values); demo (rule)"))
real_dom = pd.DataFrame(real_rows)
real_dom["timepoint"] = pd.Categorical(real_dom.timepoint, POST_FLIGHT, ordered=True)
real_dom = real_dom.sort_values(["crew_id", "timepoint"])
save_csv(real_dom, "immune_domains_real_postflight.csv")

# ---- print ------------------------------------------------------------------
print(f"Baseline crew {CREW} (REAL, mean of L-92, L-44, L-3):")
print(base.loc[["absolute_neutrophils", "absolute_lymphocytes", "white_blood_cell_count"]].round(1).to_string())
print("\nIn-flight blood day 40 (SYNTHETIC):")
print(inflight[["test_id", "value", "baseline_mean", "pct_change", "rcv_pct", "beyond_rcv"]].to_string(index=False))
show = tl[(tl.day >= 28) & (tl.day <= 58)][["day", "cellular", "inflammatory", "viral", "clinical", "n_domains",
                                            "immune_review", "context"]]
print("\nDomain timeline (14-day window):")
print(show.to_string(index=False))
rv = tl[tl.immune_review != ""].day.tolist()
print("\nReview raised on days:", f"{rv[0]}–{rv[-1]}" if rv else "never", "| 3 domains on days:",
      tl[tl.n_domains >= 3].day.tolist())
print("\nREAL post-flight C002 (% change vs own baseline):")
print(post.pivot_table(index="test_id", columns="timepoint", values="pct_change")[POST_FLIGHT].round(0).to_string())

print("\nSame 4-domain rule on the REAL post-flight data (viral/clinical not in OSDR files):")
print(real_dom.drop(columns=["is_real", "source", "evidence_level", "viral", "clinical"]).to_string(index=False))
