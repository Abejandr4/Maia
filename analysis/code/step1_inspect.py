"""STEP 1 - Open the NASA OSDR files and describe them.

Prints: columns, units, crew_id, timepoints, whether reference ranges
are included, and data problems found automatically.
Writes output/step1_column_inventory.csv and output/step1_inspection.txt
"""
import re
import sys

import pandas as pd

from common import NASA_FILES, read_nasa, parse_sample, save_csv, OUTPUT, TIMEPOINT_ORDER

lines = []


def log(s=""):
    print(s)
    lines.append(str(s))


def inventory_cbc_cmp(df, key):
    """CBC / CMP columns look like <test>_value_<unit>, <test>_range_min_<unit> ..."""
    rows = []
    for col in df.columns:
        m = re.match(r"^(.*?)_value(?:_(.*))?$", col)
        if not m:
            continue
        test, unit = m.group(1), (m.group(2) or "ratio (no unit)")
        mins = [c for c in df.columns if c.startswith(test + "_range_min")]
        maxs = [c for c in df.columns if c.startswith(test + "_range_max") or c.startswith(test + "_max")]
        rows.append({
            "file": key, "test": test, "unit_in_column_name": unit,
            "value_column": col,
            "range_min_column": mins[0] if mins else "",
            "range_max_column": maxs[0] if maxs else "",
            "n_values": int(df[col].notna().sum()),
            "n_missing": int(df[col].isna().sum()),
        })
    return rows


def inventory_multiplex(df, key):
    """Multiplex columns look like <analyte>_concentration_<unit> and <analyte>_percent."""
    rows = []
    for col in df.columns:
        m = re.match(r"^(.*?)_concentration_(.*)$", col)
        if not m:
            continue
        rows.append({
            "file": key, "test": m.group(1), "unit_in_column_name": m.group(2),
            "value_column": col, "range_min_column": "", "range_max_column": "",
            "n_values": int(df[col].notna().sum()), "n_missing": int(df[col].isna().sum()),
        })
    return rows


all_rows = []
for key in NASA_FILES:
    df, study, fname = read_nasa(key)
    df = df.copy()
    parsed = df["Sample Name"].map(parse_sample)
    df["crew_id"] = parsed.str[0]
    df["timepoint"] = parsed.str[2]
    log("=" * 80)
    log(f"{key}  |  {study}  |  {fname}")
    log(f"rows = {len(df)}   columns = {df.shape[1] - 2}")
    log(f"sample type: {sorted(set(parsed.str[1]))}")
    log(f"crew_id: {sorted(df.crew_id.unique())}")
    tps = sorted(df.timepoint.unique(), key=TIMEPOINT_ORDER.index)
    log(f"timepoints: {tps}")
    log("samples per crew: " + ", ".join(f"{c}={n}" for c, n in df.crew_id.value_counts().sort_index().items()))
    inv = inventory_cbc_cmp(df, key) if key in ("CBC", "CMP") else inventory_multiplex(df, key)
    all_rows += inv
    with_range = sum(1 for r in inv if r["range_min_column"] or r["range_max_column"])
    log(f"tests = {len(inv)}   tests with reference-range columns = {with_range}")
    units = pd.Series([r["unit_in_column_name"] for r in inv]).value_counts()
    log("units (from column names): " + "; ".join(f"{u} ({n})" for u, n in units.items()))
    if key in ("IMMUNE", "CARDIO"):
        log("NOTE: each analyte also has a '<analyte>_percent' column; its meaning is not "
            "documented in the file [UNVERIFIED] -> not used.")
    log("tests: " + ", ".join(r["test"] for r in inv))

inv = pd.DataFrame(all_rows)
inv["source"] = inv.file.map(lambda k: "S78" if NASA_FILES[k][0] == "OSD-569" else "S79")
inv["evidence_level"] = "real (column inventory)"
save_csv(inv, "step1_column_inventory.csv")

# ---------------------------------------------------------------- problems
log("=" * 80)
log("DATA PROBLEMS FOUND AUTOMATICALLY")

cbc, _, _ = read_nasa("CBC")
cbc["crew_id"] = cbc["Sample Name"].map(lambda s: parse_sample(s)[0])
cbc["timepoint"] = cbc["Sample Name"].map(lambda s: parse_sample(s)[2])

# 1) hemoglobin labelled percent but values look like g/dL
hb = cbc["hemoglobin_value_percent"]
log(f"[1] CBC hemoglobin column says 'percent' but values are {hb.min()}–{hb.max()} with range "
    f"{cbc.hemoglobin_range_min_percent.min()}–{cbc.hemoglobin_range_max_percent.max()}: "
    "this matches g/dL, not %. Unit treated as g/dL [UNVERIFIED].")

# 2) internal consistency: absolute count ≈ WBC (thousand/µL) × % × 10
log("[2] CBC consistency check: absolute count vs WBC × % (tolerance 15%)")
pairs = [("neutrophils", "absolute_neutrophils"), ("lymphocytes", "absolute_lymphocytes"),
         ("monocytes", "absolute_monocytes"), ("eosinophils", "absolute_eosinophils")]
bad = []
for pct, ab in pairs:
    expected = cbc["white_blood_cell_count_value_thousand_per_microliter"] * cbc[f"{pct}_value_percent"] * 10
    got = cbc[f"{ab}_value_cells_per_microliter"]
    rel = (got - expected).abs() / expected
    for i in cbc.index[rel > 0.15]:
        bad.append((cbc.loc[i, "Sample Name"], ab, got[i], round(expected[i])))
for b in bad:
    log(f"    {b[0]}: {b[1]} = {b[2]} but WBC×% = {b[3]}")
log("    -> the row C003 L-92 looks shifted by one or more columns (platelets 12.9, MPV 330, RDW 32.4). "
    "Its absolute counts and platelet/MPV/RDW/MCH/MCHC are excluded; WBC and % values look consistent and are kept.")

# 3) reference ranges change within the same person (sex-specific ranges?)
cmp_, _, _ = read_nasa("CMP")
cmp_["crew_id"] = cmp_["Sample Name"].map(lambda s: parse_sample(s)[0])
cmp_["timepoint"] = cmp_["Sample Name"].map(lambda s: parse_sample(s)[2])
for name, d, col in [("CBC hematocrit", cbc, "hematocrit_range_min_percent"),
                     ("CMP ALT", cmp_, "alt_range_min_units_per_liter")]:
    for c, g in d.groupby("crew_id"):
        vals = [float(v) for v in g.set_index("timepoint")[col].dropna().unique()]
        if len(vals) > 1:
            log(f"[3] {name}: {c} has different lower limits across timepoints {list(vals)} "
                "(pre-flight vs post-flight). Ranges look sex-specific; for C003 they switch [UNVERIFIED].")

# 4) glucose at R+45
g = cmp_[cmp_.timepoint.isin(["R+45", "R+82"])][["crew_id", "timepoint", "glucose_value_milligram_per_deciliter",
                                                  "glucose_range_min_milligram_per_deciliter"]]
log("[4] CMP glucose R+45 and R+82 (mg/dL, lab low limit):")
for _, r in g.sort_values(["timepoint", "crew_id"]).iterrows():
    flag = "BELOW range" if r.iloc[2] < r.iloc[3] else "ok"
    log(f"    {r.crew_id} {r.timepoint}: {r.iloc[2]}  (low {r.iloc[3]})  {flag}")

# 5) values stuck at the same maximum (assay upper limit?)
for key in ("IMMUNE", "CARDIO"):
    d, _, _ = read_nasa(key)
    for col in [c for c in d.columns if "_concentration_" in c]:
        vc = d[col].value_counts()
        if len(vc) and vc.iloc[0] >= 3:
            log(f"[5] {key} {col}: {vc.iloc[0]} of {len(d)} samples have exactly the same value {vc.index[0]} "
                "(probably an assay limit – the true value is not exact) [UNVERIFIED]")

# 6) CRP is present
log("[6] CRP is present in the cardiovascular panel (crp_concentration_picogram_per_milliliter). "
    "The guide (4.2) says 'CRP [UNVERIFIED] in the files' -> it IS in the file. 1 mg/L = 1,000,000 pg/mL.")

(OUTPUT / "step1_inspection.txt").write_text("\n".join(lines), encoding="utf-8")
