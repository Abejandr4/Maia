"""Run the whole Maia analysis, step 1 to step 9, in order.

    python run_all.py          (evaluation with 1000 runs, about 4 minutes)
    python run_all.py 200      (faster evaluation with 200 runs)
"""
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
N = sys.argv[1] if len(sys.argv) > 1 else "1000"
STEPS = ["step1_inspect.py", "step2_build_csvs.py", "step3_lab_method.py", "step4_generate.py", "step4b_generate_eva_earth.py",
         "step5_daily_method.py", "step6_immune_case.py", "step7_evaluation.py", "step8_report.py",
         "step9_export_for_app.py"]
for s in STEPS:
    print("\n" + "#" * 30, s, "#" * 30, flush=True)
    args = [sys.executable, str(HERE / s)] + ([N] if s == "step7_evaluation.py" else [])
    subprocess.run(args, check=True, cwd=HERE)
print("\nDone. Results are in the folder output/")
