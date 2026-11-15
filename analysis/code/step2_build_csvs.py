"""STEP 2 - Create the NEW CSV files of guide section 7.

  lab_results.csv     REAL  Inspiration4 CBC, CMP and cytokines, one row per value
  lab_tests.csv             one row per lab test: CV_I, CV_A, RCV (guide 3.2)
  immune_domains.csv        the 4 domains + context of guide 4.3
  targets.csv               water, exercise, sleep goals (guide 5)
  saliva_samples.csv  SYNTH weekly EBV / VZV results for the storyline (guide 4.4)
  sources_added.csv         new citations used here (S78+), links copied from the guide PDF
Every file ends with `source` and `evidence_level`.
"""
import re

import numpy as np
import pandas as pd

from common import (NASA_FILES, read_nasa, parse_sample, day_from_launch, days_from_return,
                    save_csv, PRE_FLIGHT)

# ----------------------------------------------------------------- sources
OSDR = "https://osdr.nasa.gov/geode-py/ws/studies/{s}/download?source=datamanager&file={f}"
sources_added = pd.DataFrame([
    ["S78", "NASA OSDR OSD-569 – Inspiration4 complete blood count (LSDS-7 CBC)",
     "https://osdr.nasa.gov/osdr/data/osd/files/569", "lab_results.csv", "real"],
    ["S79", "NASA OSDR OSD-575 – Inspiration4 CMP and multiplex serum panels (LSDS-8)",
     "https://osdr.nasa.gov/osdr/data/osd/files/575", "lab_results.csv", "real"],
    ["S80", "Overbey et al. 2024, Nature – SOMA atlas", "https://doi.org/10.1038/s41586-024-07639-y",
     "immune_domains.csv", "consensus"],
    ["S81", "Jones et al. 2024, Nature – Inspiration4", "https://nature.com/articles/s41586-024-07648-x",
     "immune_domains.csv", "consensus"],
    ["S82", "Sanders et al. 2024, npj Microgravity – Inspiration4 data in OSDR",
     "https://www.nature.com/articles/s41526-024-00393-5", "lab_results.csv", "consensus"],
    ["S83", "Crucian et al. 2018, Front Immunol – immune dysregulation in spaceflight",
     "https://www.frontiersin.org/journals/immunology/articles/10.3389/fimmu.2018.01437/pdf",
     "immune_domains.csv", "consensus"],
    ["S84", "Crucian et al. 2015, npj Microgravity – in-flight immune changes",
     "https://www.nature.com/articles/npjmgrav201513", "immune_domains.csv; lab_tests.csv", "consensus"],
    ["S85", "NASA HRP Evidence Report – altered immune response",
     "https://ntrs.nasa.gov/api/citations/20150008177/downloads/20150008177.pdf", "immune_domains.csv", "consensus"],
    ["S86", "Mehta et al. 2017, npj Microgravity – latent virus reactivation",
     "https://www.nature.com/articles/s41526-017-0015-y.pdf", "saliva_samples.csv; immune_domains.csv", "consensus"],
    ["S87", "Crucian et al. 2016 – clinical immune events in ISS crew",
     "https://www.dovepress.com/article/download/29846", "immune_domains.csv", "consensus"],
    ["S88", "EFLM Biological Variation Database", "https://biologicalvariation.eu/meta_calculations",
     "lab_tests.csv", "consensus"],
    ["S89", "Worked RCV values (PMC12334944)", "https://pmc.ncbi.nlm.nih.gov/articles/PMC12334944/",
     "lab_tests.csv", "consensus"],
    ["S90", "Shibata et al. 2023, JACC – heart and exercise on the ISS",
     "https://www.jacc.org/doi/10.1016/j.jacc.2023.05.058", "targets.csv", "estimate"],
    ["S91", "Ahmed et al. 2025 – bone density after flight", "https://pmc.ncbi.nlm.nih.gov/articles/PMC12626757/",
     "measurements context", "estimate"],
    ["S92", "Fu et al. 2019, Circulation – blood pressure in long-duration flight",
     "https://www.ahajournals.org/doi/full/10.1161/CIRCULATIONAHA.119.041050", "daily_synthetic.csv", "estimate"],
    ["S93", "Cucinotta 2008 – ISS radiation", "https://pubmed.ncbi.nlm.nih.gov/18582161/",
     "daily_synthetic.csv", "consensus"],
    ["S94", "NASA OCHMO water technical brief",
     "https://www.nasa.gov/wp-content/uploads/2023/03/water-technical-brief-ochmo.pdf", "targets.csv", "consensus"],
    ["S95", "NASA ISS blog 2022-07-27 – crew schedule focuses on exercise",
     "https://www.nasa.gov/blogs/spacestation/2022/07/27/crews-wednesday-schedule-focuses-on-exercise-science-and-maintenance/",
     "targets.csv", "estimate"],
    ["S96", "NASA OCHMO sleep accommodations technical brief",
     "https://www.nasa.gov/wp-content/uploads/2023/03/sleep-accomodations-technical-brief-ochmo.pdf",
     "targets.csv", "consensus"],
    ["S97", "NASA-STD-3001 Vol. 2 Section 11 – Spacesuits (web page)",
     "https://www.nasa.gov/reference/11-0-spacesuits-vol-2/", "targets.csv", "consensus"],
], columns=["id", "reference", "link", "used_in", "evidence_level"])
sources_added["source"] = "Maia Build Guide (Nov 14, 2026), sections 2 and 10"
sources_added = sources_added[["id", "reference", "link", "used_in", "source", "evidence_level"]]
save_csv(sources_added, "sources_added.csv")

# ----------------------------------------------------------------- lab_results
UNIT = {
    "cells_per_microliter": "cells/µL", "thousand_per_microliter": "10^3/µL",
    "million_per_microliter": "10^6/µL", "percent": "%", "femtoliter": "fL", "picogram": "pg",
    "grams_per_deciliter": "g/dL", "gram_per_deciliter": "g/dL", "milligram_per_deciliter": "mg/dL",
    "millimol_per_liter": "mmol/L", "units_per_liter": "U/L",
    "milliliter_per_minute_per_1.73_meter_squared": "mL/min/1.73m²",
    "picogram_per_milliliter": "pg/mL", "nanogram_per_milliliter": "ng/mL", "": "ratio",
}
SHIFTED_ROW = ("C003", "L-92")  # found in step 1
SHIFTED_TESTS = {"absolute_basophils", "absolute_eosinophils", "absolute_lymphocytes", "absolute_monocytes",
                 "absolute_neutrophils", "platelet_count", "mpv", "rdw", "mch", "mchc"}

rows = []
for key, (study, fname) in NASA_FILES.items():
    df, _, _ = read_nasa(key)
    src = "S78" if study == "OSD-569" else "S79"
    if key in ("CBC", "CMP"):
        tests = []
        for col in df.columns:
            m = re.match(r"^(.*?)_value(?:_(.*))?$", col)
            if m:
                t = m.group(1)
                lo = next((c for c in df.columns if c.startswith(t + "_range_min")), None)
                hi = next((c for c in df.columns if c.startswith(t + "_range_max") or c.startswith(t + "_max")), None)
                tests.append((t, col, m.group(2) or "", lo, hi))
    else:
        tests = [(re.match(r"^(.*?)_concentration_(.*)$", c).group(1), c,
                  re.match(r"^(.*?)_concentration_(.*)$", c).group(2), None, None)
                 for c in df.columns if "_concentration_" in c]
    for _, r in df.iterrows():
        crew, _, tp = parse_sample(r["Sample Name"])
        for t, col, unit, lo, hi in tests:
            v = pd.to_numeric(r[col], errors="coerce")
            if pd.isna(v):
                continue
            flag = ""
            u = UNIT.get(unit, unit)
            if t == "hemoglobin":
                u, flag = "g/dL", "column says percent; values match g/dL [UNVERIFIED]"
            if key == "CBC" and (crew, tp) == SHIFTED_ROW and t in SHIFTED_TESTS:
                flag = "excluded: columns shifted in source row"
            rows.append({
                "crew_id": crew, "timepoint": tp, "day_from_launch": day_from_launch(tp),
                "days_from_return": days_from_return(tp),
                "phase": "pre-flight" if tp in PRE_FLIGHT else "post-flight",
                "panel": key, "test_id": t, "value": v, "unit": u,
                "ref_low": pd.to_numeric(r[lo], errors="coerce") if lo else np.nan,
                "ref_high": pd.to_numeric(r[hi], errors="coerce") if hi else np.nan,
                "source_file": f"{study}/{fname}", "is_real": "yes", "quality_flag": flag,
                "source": src, "evidence_level": "real",
            })
lab = pd.DataFrame(rows)

# repeated identical values in multiplex panels -> possible assay limit
for (panel, t), g in lab[lab.panel.isin(["IMMUNE", "CARDIO"])].groupby(["panel", "test_id"]):
    vc = g.value.value_counts()
    if vc.iloc[0] >= 3:
        idx = g.index[g.value == vc.index[0]]
        lab.loc[idx, "quality_flag"] = "repeated identical value – possible assay limit [UNVERIFIED]"
save_csv(lab, "lab_results.csv")

# ----------------------------------------------------------------- lab_tests
K = 1.96 * np.sqrt(2)  # RCV = K * sqrt(CV_A^2 + CV_I^2)
lab_tests = pd.DataFrame([
    # test_id, name, unit, cv_i, cv_a, rcv (guide), direction, source, level, notes
    ["white_blood_cell_count", "White cells (WBC)", "10^3/µL", 11.1, np.nan, 31.0, "up",
     "S88; S89", "consensus", "RCV from worked value (PMC12334944); CV_A not given in the guide"],
    ["absolute_neutrophils", "Neutrophils (absolute)", "cells/µL", 14.6, np.nan, 39.0, "up",
     "S88; S89", "consensus",
     "CHECK: with CV_I 14.6% the RCV cannot be below 40.5% (CV_A = 0); guide value 39% kept [UNVERIFIED]"],
    ["absolute_lymphocytes", "Lymphocytes (absolute)", "cells/µL", 10.9, np.nan, 31.5, "down",
     "S88; S89", "consensus", "RCV from worked value (PMC12334944); CV_A not given in the guide"],
    ["crp", "C-reactive protein (CRP)", "pg/mL (file) = mg/L × 10^6", 34.7, 5.0, 97.0, "up",
     "S88; S79", "consensus (CV_I); [UNVERIFIED] (CV_A 5%)", "only a doubling matters; CRP is in OSD-575 cardiovascular panel"],
    ["nlr", "Neutrophil-to-lymphocyte ratio (derived)", "ratio", np.nan, np.nan, np.nan, "up",
     "S78", "demo", "judged only vs own baseline; no astronaut cut-off and no RCV [UNVERIFIED]"],
    ["il_6", "Interleukin-6", "pg/mL", np.nan, np.nan, np.nan, "up", "S79; S80", "demo",
     "rule: above the person's pre-flight range (max of L-92, L-44, L-3)"],
    ["mcp_1", "CCL2 / MCP-1", "pg/mL", np.nan, np.nan, np.nan, "up", "S79; S80", "demo",
     "rule: above the person's pre-flight range; MCP-1 is CCL2"],
    ["il_10", "Interleukin-10", "pg/mL", np.nan, np.nan, np.nan, "up", "S79; S80", "demo",
     "shown as context only (not in the 4.3 rule)"],
    ["tnfα", "TNF-α", "pg/mL", np.nan, np.nan, np.nan, "up", "S79", "demo", "shown as context only"],
    ["glucose", "Glucose", "mg/dL", np.nan, np.nan, np.nan, "both", "S79", "consensus (lab range)",
     "compared with the lab range in the file; cohort-wide low at one time point = data quality"],
], columns=["test_id", "name", "unit", "cv_i_pct", "cv_a_pct", "rcv_pct", "concern_direction",
            "source", "evidence_level", "notes"])
cva = lab_tests.cv_a_pct.fillna(0)
lab_tests["rcv_formula_pct"] = (K * np.sqrt(cva ** 2 + lab_tests.cv_i_pct ** 2)).round(1)
lab_tests = lab_tests[["test_id", "name", "unit", "cv_i_pct", "cv_a_pct", "rcv_pct", "rcv_formula_pct",
                       "concern_direction", "notes", "source", "evidence_level"]]
save_csv(lab_tests, "lab_tests.csv")

# ----------------------------------------------------------------- immune_domains
immune = pd.DataFrame([
    ["cellular", "WBC or neutrophils up by more than their RCV, or lymphocytes down by more than theirs",
     14, "yes", "S84; S88; S89", "demo"],
    ["inflammatory", "CRP more than doubled (>97% RCV), or IL-6 / CCL2 above the person's pre-flight range",
     14, "yes", "S80; S81; S88", "demo"],
    ["viral", "A saliva sample positive for EBV or VZV, or rising copies", 14, "yes", "S86", "demo"],
    ["clinical", "A logged rash, cold sore, or fever (temperature marked change, high side)", 14, "yes",
     "S87", "demo"],
    ["context", "Low sleep (sleep marked change, low side, or schedule shift)", 14, "no", "S40", "demo"],
    ["context", "Solar event (DONKI SEP)", 14, "no", "S34; S53", "demo"],
    ["context", "EVA in the last 72 h", 3, "no", "S48", "demo"],
    ["context", "Cabin CO₂ peak (1-h average > 3 mmHg)", 14, "no", "S05", "demo"],
], columns=["domain", "condition", "window_days", "counts_alone", "source", "evidence_level"])
immune.insert(4, "notes", ["counts as one domain; review needs ≥2 domains in 14 days"] * 4 +
              ["adds weight and is shown; never triggers the review alone"] * 4)
save_csv(immune, "immune_domains.csv")

# ----------------------------------------------------------------- targets
targets = pd.DataFrame([
    ["water_per_day", "≥", 2.5, "L per crew member per day", "iss|lunar_surface|mars_transit", "[V2 6109]",
     "S94; S01", "consensus", "includes about 600 mL per meal as hot water"],
    ["water_during_eva", "≥", 240, "mL per EVA hour", "spacewalk", "[V2 11030]", "S97; S03", "consensus", ""],
    ["water_after_landing", "", 1.0, "kg per 8 h", "back_on_earth", "[V2 6037]", "S01", "consensus", ""],
    ["exercise_per_day", "about", 2, "h per day", "iss|lunar_surface|mars_transit", "[V2 7038] sets no hours",
     "S95; S90", "estimate", "aerobic + resistance (ARED, treadmill, CEVIS); operational average"],
    ["exercise_minimum_jacc", "≥", 1.5, "h per day, 6 days a week", "iss", "", "S90", "estimate",
     "30–45 min aerobic + 60–75 min resistance (Shibata 2023)"],
    ["sleep_period", "", 8.5, "h sleep period recommended", "iss|lunar_surface|mars_transit", "[V1 6001]",
     "S96; S04", "consensus", "actual ISS average 6–6.5 h (reference, not a goal)"],
], columns=["goal", "comparator", "value", "unit", "location", "standard_id", "source", "evidence_level", "notes"])
targets = targets[["goal", "comparator", "value", "unit", "location", "standard_id", "notes", "source", "evidence_level"]]
save_csv(targets, "targets.csv")

# ----------------------------------------------------------------- saliva_samples (synthetic)
sal = []
for day in range(7, 61, 7):
    for virus in ("EBV", "VZV"):
        positive = virus == "EBV" and day == 35   # storyline 4.4: EBV positive on day 35
        sal.append({"person": "lucia (sample)", "day": day, "virus": virus,
                    "result": "positive" if positive else "negative",
                    "copies_per_ml": np.nan,
                    "is_synthetic": "yes",
                    "notes": ("storyline 4.4; copy number not cited -> left empty [UNVERIFIED]" if positive else
                              "VZV kept negative: 65% is per mission, not per sample" if virus == "VZV" else ""),
                    "source": "S86; S48", "evidence_level": "demo"})
saliva = pd.DataFrame(sal)
# storyline day 35 is a weekly slot (5 × 7) – check it exists
assert ((saliva.day == 35) & (saliva.result == "positive")).sum() == 1
save_csv(saliva, "saliva_samples.csv")

# ----------------------------------------------------------------- print summary
print("lab_results.csv:", lab.shape, "| tests:", lab.test_id.nunique(), "| flagged rows:",
      int((lab.quality_flag != "").sum()))
print(lab.groupby("panel").agg(rows=("value", "size"), tests=("test_id", "nunique"),
                               with_ref=("ref_low", lambda s: int(s.notna().sum()))))
print(lab.quality_flag.value_counts().to_string())
print("\nlab_tests.csv\n", lab_tests[["test_id", "cv_i_pct", "cv_a_pct", "rcv_pct", "rcv_formula_pct",
                                     "concern_direction"]].to_string(index=False))
print("\nimmune_domains.csv\n", immune[["domain", "window_days", "counts_alone", "condition"]].to_string(index=False))
print("\ntargets.csv\n", targets[["goal", "comparator", "value", "unit", "evidence_level"]].to_string(index=False))
print("\nsaliva_samples.csv:", saliva.shape, "positives:",
      saliva[saliva.result == "positive"][["day", "virus"]].values.tolist())
print("\nsources_added.csv:", len(sources_added), "rows (S78–S97)")
