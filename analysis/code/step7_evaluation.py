"""STEP 7 - Evaluate the daily method on synthetic data (guide 8.7).

Monte Carlo: the generator is run many times with different random seeds.
  A) demo scenario (drift + injected events): detection rate and days to detection per injected change,
     false alarms (marked changes not caused by an injected change) per 100 crew-days.
  B) null scenario (no drift, no events): false alarms per 100 crew-days, with AR(1) phi = 0.5 and phi = 0.
  C) sustained 6-day shift of 2.5 / 3 / 3.5 SD on heart rate (days 33–38): detection rate,
     compared with the guide's ESTIMATE (34% / 73% / 95%, computed for a known band and independent days).
  D) analytic check of the guide's ESTIMATE numbers (binomial).
  E) cabin CO₂: 1-h values > 3 mmHg in the null scenario (reference-limit alerts).
Monitoring days = 22–60 (39 crew-days per run). 1 crew-day = one astronaut, one day, all measurements.
Writes: evaluation.csv, evaluation_runs_summary.csv
"""
import sys
from math import comb
from multiprocessing import Pool

import numpy as np
import pandas as pd
from scipy.stats import norm

from common import OUTPUT, save_csv
from daily_method import analyze, co2_checks, load_settings, BANDED
from generator import generate, EVENTS

N = int(sys.argv[1]) if len(sys.argv) > 1 else 500
MON_DAYS = 60 - 21          # days 22–60
SETTINGS = load_settings()
EV_DEMO = pd.DataFrame([dict(day=d, id=t, kind="event") for d, t, _ in EVENTS])
EV_NONE = pd.DataFrame(columns=["day", "id", "kind"])

# windows in which a marked change counts as "caused by the injected change"
EXPECTED = {
    "hr_plus14": ("heart_rate", "high", 33, 38),
    "sleep_minus2": ("sleep", "low", 33, 35),
    "temp_drift": ("temperature", "high", 22, 60),
}


def is_expected(ep):
    for cid, (m, side, a, b) in EXPECTED.items():
        if ep.measurement_id == m and ep.side == side and a <= ep.detection_day <= b + 5:
            return cid
    return None


def run_demo(seed):
    d, _ = generate(seed=seed, scenario="demo", with_co2=False)
    _, ep, _, _ = analyze(d, EV_DEMO, SETTINGS)
    out = {"seed": seed}
    for cid in EXPECTED:
        hits = [e for e in ep.itertuples() if is_expected(e) == cid]
        out[cid + "_detected"] = bool(hits)
        out[cid + "_day"] = hits[0].detection_day if hits else np.nan
    out["false_alarms"] = sum(1 for e in ep.itertuples() if is_expected(e) is None)
    out["false_by_measurement"] = ";".join(e.measurement_id for e in ep.itertuples() if is_expected(e) is None)
    return out


def run_null(args):
    seed, phi = args
    d, _ = generate(seed=seed, scenario="null", phi=phi, with_co2=False)
    _, ep, _, _ = analyze(d, EV_NONE, SETTINGS)
    return {"seed": seed, "phi": phi, "false_alarms": len(ep),
            **{m: int((ep.measurement_id == m).sum()) if len(ep) else 0 for m in BANDED}}


def run_shift(args):
    seed, size = args
    d, _ = generate(seed=seed, scenario="null", with_co2=False, shift=("heart_rate", size, 33, 38))
    d = d[d.measurement_id == "heart_rate"]
    _, ep, _, _ = analyze(d, EV_NONE, SETTINGS)
    hits = [e for e in ep.itertuples() if e.side == "high" and 33 <= e.detection_day <= 43]
    return {"seed": seed, "size": size, "detected": bool(hits),
            "day": hits[0].detection_day if hits else np.nan}


def run_co2(seed):
    _, h = generate(seed=seed, scenario="null", with_co2=True)
    c = co2_checks(h, EV_NONE.assign(id=[]), SETTINGS)
    return {"seed": seed, "hours_over_3": int(c.hours_over_3.sum()), "days_with_alert": int((c.hours_over_3 > 0).sum())}


def p_at_least(k, n, p):
    return sum(comb(n, j) * p ** j * (1 - p) ** (n - j) for j in range(k, n + 1))


if __name__ == "__main__":
    seeds = range(1000, 1000 + N)
    with Pool() as pool:
        demo = pd.DataFrame(pool.map(run_demo, seeds))
        null05 = pd.DataFrame(pool.map(run_null, [(s, 0.5) for s in seeds]))
        null00 = pd.DataFrame(pool.map(run_null, [(s, 0.0) for s in seeds]))
        shift = pd.DataFrame(pool.map(run_shift, [(s, z) for z in (2.5, 3.0, 3.5) for s in seeds]))
        co2 = pd.DataFrame(pool.map(run_co2, list(seeds)[:200]))

    rows = []
    crew_days = N * MON_DAYS
    labels = {"hr_plus14": ("Heart rate +14 bpm, days 33, 35–38 (3.5 SD)", 33),
              "sleep_minus2": ("Sleep −2 h, 3 nights (days 33–35, 2.9 SD)", 33),
              "temp_drift": ("Temperature +1 °C over 75 days (drift)", 1)}
    for cid, (lab, start) in labels.items():
        det = demo[cid + "_detected"]
        days = demo.loc[det, cid + "_day"] - start
        rows.append(dict(section="A demo", item=lab, runs=N, detection_rate_pct=round(det.mean() * 100, 1),
                         false_alarms_per_100_crew_days=np.nan,
                         days_to_detection_median=(days.median() if det.any() else np.nan),
                         days_to_detection_p10_p90=(f"{days.quantile(.1):.0f}–{days.quantile(.9):.0f}" if det.any() else ""),
                         note=("detection day counted from flight day 1" if cid == "temp_drift" else
                               "the 3 injected nights alone cannot reach 4 of 6; detections need a 4th low day (noise or the 2-h night on day 40)" if cid == "sleep_minus2" else "")))
    rows.append(dict(section="A demo", item="False alarms (marked changes not caused by an injected change)",
                     runs=N, detection_rate_pct=np.nan,
                     false_alarms_per_100_crew_days=round(demo.false_alarms.sum() / crew_days * 100, 2),
                     days_to_detection_median=np.nan, days_to_detection_p10_p90="",
                     note="by measurement: " + str(pd.Series(";".join(demo.false_by_measurement).split(";"))
                                                   .replace("", np.nan).dropna().value_counts().to_dict())))
    for phi, df in ((0.5, null05), (0.0, null00)):
        per_m = {m: float(round(df[m].sum() / crew_days * 100, 2)) for m in BANDED}
        rows.append(dict(section="B null", item=f"No change, AR(1) phi = {phi}", runs=N, detection_rate_pct=np.nan,
                         false_alarms_per_100_crew_days=round(df.false_alarms.sum() / crew_days * 100, 2),
                         days_to_detection_median=np.nan, days_to_detection_p10_p90="",
                         note=f"runs with ≥1 false alarm: {(df.false_alarms > 0).mean() * 100:.1f}%; per measurement: {per_m}"))
    guide = {2.5: 34, 3.0: 73, 3.5: 95}
    for z in (2.5, 3.0, 3.5):
        g = shift[shift["size"] == z]
        days = g.loc[g.detected, "day"] - 33
        rows.append(dict(section="C shift", item=f"Heart rate shift {z} SD for 6 days (days 33–38)", runs=N,
                         detection_rate_pct=round(g.detected.mean() * 100, 1), false_alarms_per_100_crew_days=np.nan,
                         days_to_detection_median=days.median(),
                         days_to_detection_p10_p90=f"{days.quantile(.1):.0f}–{days.quantile(.9):.0f}",
                         note=f"guide ESTIMATE {guide[z]}% (known band, independent days); here band learned on 14 days + AR(1)"))
    # D analytic check
    p0 = norm.sf(2.5)
    fa = 2 * p_at_least(4, 6, p0)
    rows.append(dict(section="D analytic", item="False alarm per 6-day window (independent days, known band, both sides)",
                     runs=np.nan, detection_rate_pct=np.nan, false_alarms_per_100_crew_days=np.nan,
                     days_to_detection_median=np.nan, days_to_detection_p10_p90="",
                     note=f"{fa:.1e} (guide: ≈ 4 × 10⁻⁸)"))
    for z in (2.5, 3.0, 3.5):
        rows.append(dict(section="D analytic", item=f"Detection in one 6-day window, shift {z} SD", runs=np.nan,
                         detection_rate_pct=round(p_at_least(4, 6, norm.sf(2.5 - z)) * 100, 1),
                         false_alarms_per_100_crew_days=np.nan, days_to_detection_median=np.nan,
                         days_to_detection_p10_p90="", note=f"guide: {guide[z]}%"))
    rows.append(dict(section="E CO₂", item="Cabin CO₂ 1-h value > 3 mmHg, no event (daily SD 0.4)", runs=len(co2),
                     detection_rate_pct=np.nan,
                     false_alarms_per_100_crew_days=round(co2.days_with_alert.sum() / (len(co2) * 60) * 100, 1),
                     days_to_detection_median=np.nan, days_to_detection_p10_p90="",
                     note=f"per 100 crew-days = days with ≥1 alert; mean days with alert per 60-day run: {co2.days_with_alert.mean():.1f}; mean hours > 3 per run: {co2.hours_over_3.mean():.1f}"))
    ev = pd.DataFrame(rows)
    ev["is_synthetic"] = "yes"
    ev["source"] = "S56; S57; S48"
    ev["evidence_level"] = "estimate (our calculation)"
    save_csv(ev, "evaluation.csv")
    demo = demo.assign(is_synthetic="yes", source="S48", evidence_level="estimate (our calculation)")
    save_csv(demo, "evaluation_runs_demo.csv")
    pd.set_option("display.width", 250)
    pd.set_option("display.max_colwidth", 120)
    print(ev.drop(columns=["is_synthetic", "source", "evidence_level"]).to_string(index=False))
