# Maia – análisis de datos (NASA Space Apps 2026)

Código en Python (pandas + numpy) que sigue el plan de la sección 8 de *Maia – Build Guide*.

## Carpetas
- `input/`  archivos originales: los 4 CSV de NASA OSDR (OSD-569, OSD-575) y `Maia_Data_files.xlsx`
- `code/`   el código, un archivo por paso
- `output/` todo lo que crea el código (CSV y JSON)

## Cómo correrlo
1. Instala Python 3.10 o más nuevo.
2. Abre una terminal y escribe: `pip install pandas numpy scipy openpyxl`
3. Entra a la carpeta del código: `cd maia/code`
4. Corre todo: `python run_all.py` (tarda unos 4 minutos, por la evaluación con 1000 repeticiones).
   - Para una versión rápida: `python run_all.py 200`
   - Para correr un solo paso: `python step3_lab_method.py` (cada paso usa lo que crearon los anteriores)

## Qué hace cada paso
| Paso | Archivo | Qué crea |
|---|---|---|
| 1 | `step1_inspect.py` | `step1_inspection.txt`, `step1_column_inventory.csv`: columnas, unidades, crew_id, timepoints, rangos y problemas encontrados |
| 2 | `step2_build_csvs.py` | `lab_results.csv` (REAL), `lab_tests.csv`, `immune_domains.csv`, `targets.csv`, `saliva_samples.csv` (sintético), `sources_added.csv` |
| 3 | `step3_lab_method.py` | `lab_analysis.csv` (línea base pre-vuelo, % de cambio, RCV, NLR), `lab_data_quality.csv` (glucosa R+45) |
| 4 | `step4_generate.py` + `generator.py` | `daily_synthetic.csv`, `hourly_cabin_co2.csv`, `events.csv` (todo `is_synthetic = yes`) |
| 5 | `step5_daily_method.py` + `daily_method.py` | `daily_bands.csv`, `daily_status.csv`, `daily_changes.csv`, `cabin_co2_daily.csv`, `daily_artefacts.csv` |
| 6 | `step6_immune_case.py` | `immune_timeline.csv`, `immune_inflight_labs.csv`, `immune_postflight_real.csv`, `immune_domains_real_postflight.csv` |
| 7 | `step7_evaluation.py` | `evaluation.csv` (tabla principal), `evaluation_runs_demo.csv` |
| 8 | `step8_report.py` | `maia_report.json` (lo que manda la app), `maia_report_pretty.json` (versión legible), `maia_lab_real.json` |

## Reglas que respeta el código
- Cada número sale de: los CSV reales de NASA, un valor citado en la guía o el generador sintético de la sección 6.
- Lo sintético lleva `is_synthetic = yes`; lo real lleva `is_real = yes`.
- Cada CSV termina con `source` y `evidence_level`. Las fuentes nuevas (S78–S97) están en `sources_added.csv`.
- Lo que no se pudo verificar está marcado `[UNVERIFIED]`.
- Semilla fija (`SEED = 7` en el paso 4), así que los datos del demo salen iguales cada vez que lo corres.

## Cambio del 14 nov (23:15)
- El CO₂ de cabina ahora se genera **un valor por día** (SD 0.4 de un día a otro, [UNVERIFIED]). Solo el evento del día 52 (4.0 mmHg por 6 h) es hora por hora.
- Antes se generaba hora por hora con SD 0.4, y el ruido pasaba de 3 mmHg en 1 de cada 3 días sin que hubiera ningún evento.

## Paso 9 y la app
`step9_export_for_app.py` crea los JSON para React en `output/app/` y, si esta carpeta está dentro del proyecto (Maia/analysis), los copia a `Maia/src/data/generated/`. Instrucciones completas en `app_integration/INTEGRAR.md`.

## Cambio del 15 nov (01:00)
- `step8_report.py` genera el reporte para el **día 42** (el "hoy" de la app). Otro día: `python3 step8_report.py 60`.
- `step9_export_for_app.py` también crea `maia_alerts.json` (alertas con los textos de `alert_types.csv`).
- La radiación se guarda con 4 decimales para que la dosis diaria salga exacta (0.40 mSv).
