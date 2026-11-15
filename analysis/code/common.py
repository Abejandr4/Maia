"""Shared helpers for the Maia analysis (NASA Space Apps 2026).

All paths are relative to the project folder `maia/`:
    input/   original files (NASA OSDR CSVs + Maia_Data_files.xlsx)
    output/  everything this code creates
"""
import re
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
INPUT = ROOT / "input"
OUTPUT = ROOT / "output"
OUTPUT.mkdir(exist_ok=True)

XLSX = INPUT / "Maia_Data_files.xlsx"

NASA_FILES = {
    "CBC": ("OSD-569", "LSDS-7_Complete_Blood_Count_CBC_TRANSFORMED.csv"),
    "CMP": ("OSD-575", "LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED.csv"),
    "IMMUNE": ("OSD-575", "LSDS-8_Multiplex_serum_immune_EvePanel_TRANSFORMED.csv"),
    "CARDIO": ("OSD-575", "LSDS-8_Multiplex_serum_cardiovascular_EvePanel_TRANSFORMED.csv"),
}

# Inspiration4 flew about 3 days (guide, section 2: "a 3-day flight").
FLIGHT_DAYS = 3
PRE_FLIGHT = ["L-92", "L-44", "L-3"]
POST_FLIGHT = ["R+1", "R+45", "R+82", "R+194"]
TIMEPOINT_ORDER = PRE_FLIGHT + POST_FLIGHT

SAMPLE_RE = re.compile(r"^(C\d{3})_(whole-blood|serum)_([LR][+-]\d+)")

# NA markers used inside the OSDR files
NA_VALUES = ["NA", "N/A", "na", ""]


def read_nasa(key):
    """Read one OSDR CSV with NA markers turned into empty values."""
    study, fname = NASA_FILES[key]
    df = pd.read_csv(INPUT / fname, na_values=NA_VALUES, keep_default_na=True)
    return df, study, fname


def parse_sample(name):
    """'C001_whole-blood_L-3_cbc' -> ('C001', 'whole-blood', 'L-3')."""
    m = SAMPLE_RE.match(str(name))
    if not m:
        raise ValueError(f"Unexpected sample name: {name}")
    return m.group(1), m.group(2), m.group(3)


def day_from_launch(tp):
    """L-92 -> -92 ; R+1 -> 3 + 1 = 4 (days counted from launch)."""
    n = int(tp[1:])
    return n if tp.startswith("L") else FLIGHT_DAYS + n


def days_from_return(tp):
    """R+1 -> 1 ; L-92 -> None (pre-flight)."""
    return int(tp[1:]) if tp.startswith("R") else None


def ar1_noise(n, sd, phi, rng):
    """AR(1) noise with marginal standard deviation = sd.

    e[t] = phi * e[t-1] + sqrt(1 - phi^2) * sd * z[t],   z ~ N(0, 1)
    """
    e = np.empty(n)
    e[0] = rng.normal(0, sd)
    s = np.sqrt(1 - phi ** 2) * sd
    for t in range(1, n):
        e[t] = phi * e[t - 1] + rng.normal(0, s)
    return e


def save_csv(df, name):
    path = OUTPUT / name
    df.to_csv(path, index=False)
    return path
