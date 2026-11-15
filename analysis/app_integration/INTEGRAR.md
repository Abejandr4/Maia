# Cómo meter el análisis en la app de Maia (Vite + React + TypeScript)

## Estructura final
```
Maia/
├── analysis/                  ← esta carpeta (antes se llamaba "maia")
│   ├── code/                  Python, pasos 1–9
│   ├── input/                 CSV de NASA + Maia_Data_files.xlsx
│   └── output/                CSV y JSON que crea el Python
├── src/
│   ├── components/MaiaDataDemo.tsx   ← copiado de app_integration
│   ├── data/maiaData.ts              ← copiado de app_integration
│   └── data/generated/*.json         ← lo crea el paso 9 (no editar a mano)
└── package.json
```

## Pasos
1. Mueve la carpeta `maia` del zip dentro de tu proyecto `Maia` y renómbrala a `analysis`.
2. Copia `analysis/app_integration/src/data/maiaData.ts` a `Maia/src/data/`.
3. Copia `analysis/app_integration/src/components/MaiaDataDemo.tsx` a `Maia/src/components/`.
4. En la terminal (desde la carpeta Maia):
   ```
   cd analysis/code
   python3 step9_export_for_app.py
   ```
   Debe terminar con `Copied to .../Maia/src/data/generated`.
5. Para probar, en `src/App.tsx` agrega arriba:
   `import MaiaDataDemo from './components/MaiaDataDemo'`
   y dentro del return: `<MaiaDataDemo />`
6. Regresa a la carpeta Maia (`cd ../..`) y corre `npm run dev`.

## Cuando cambie algo en los datos
`cd analysis/code` → `python3 run_all.py` → los JSON de `src/data/generated` se actualizan solos.

## Qué archivo usar en cada pantalla
| Pantalla | Archivo | Qué usar |
|---|---|---|
| Reports (flight surgeon) | maia_report.json | `report`, `reportSection('Ordered changes')`, `reportSizeKb()` |
| Gráfica de una medida | maia_daily.json | `series('heart_rate', 60, 7)`, `daily.bands`, `daily.reference` |
| Cambios marcados / alertas | maia_daily.json | `daily.changes`, `daily.events` |
| Caso inmune | maia_immune.json | `immune.timeline`, `immuneOnDay(41)`, `immune.inflight_labs` |
| Laboratorio real (Inspiration4) | maia_lab_real.json | `labReal.crew.C002.absolute_lymphocytes`, `labReal.data_quality` |
| Evidencia del método | maia_evaluation.json | `evaluation` |
| Metas (mascota) | maia_targets.json | `targets` |
| Link a la fuente de cada alerta | maia_sources.json | `sourceLinks('S78; S79')` |

Regla: todo lo que viene de `daily`, `immune` y `report` es sintético → muéstralo con la etiqueta "sample".
