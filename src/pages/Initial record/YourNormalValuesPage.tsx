import { useMemo, useState } from "react";
import "../pages.css";

/* -------------------------------------------------------------------------- */
/* Tipos                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Linea base personal. Los modulos Body Sensors, Home y Report pueden leer
 * estos valores desde localStorage ("normalValues").
 */
export interface NormalValuesData {
  bloodPressure: { systolic: number; diastolic: number; done: boolean };
  pulseBpm: { value: number; done: boolean };
  temperatureC: { value: number; done: boolean };
  spo2Percent: { value: number; done: boolean };
  weightKg: { value: number | null; done: boolean };
  usualSleepHours: { value: number | null; done: boolean };
  moodScore: { value: number | null; done: boolean };
}

interface YourNormalValuesPageProps {
  onBack: () => void;
  onComplete: () => void;
}

type EditableKey = "weight" | "sleep" | "mood";

/* -------------------------------------------------------------------------- */
/* Constantes                                                                 */
/* -------------------------------------------------------------------------- */

const STORAGE_KEY = "normalValues";
const PROFILE_KEY = "userProfile";
const TOTAL_STEPS = 8;
const CURRENT_STEP = 5;
const TOTAL_MEASUREMENTS = 6;

const DEFAULT_DATA: NormalValuesData = {
  bloodPressure: { systolic: 124, diastolic: 78, done: true },
  pulseBpm: { value: 64, done: true },
  temperatureC: { value: 36.6, done: true },
  spo2Percent: { value: 98, done: true },
  weightKg: { value: null, done: false },
  usualSleepHours: { value: null, done: false },
  moodScore: { value: null, done: false },
};

/* -------------------------------------------------------------------------- */
/* Utilidades de lectura                                                      */
/* -------------------------------------------------------------------------- */

function num(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function nullableNum(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function loadData(): NormalValuesData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_DATA;
    const p = JSON.parse(raw) as Partial<NormalValuesData>;
    const d = DEFAULT_DATA;
    const weightValue = nullableNum(p.weightKg?.value);
    const sleepValue = nullableNum(p.usualSleepHours?.value);
    const moodValue = nullableNum(p.moodScore?.value);
    return {
      bloodPressure: {
        systolic: num(p.bloodPressure?.systolic, d.bloodPressure.systolic),
        diastolic: num(p.bloodPressure?.diastolic, d.bloodPressure.diastolic),
        done: bool(p.bloodPressure?.done, d.bloodPressure.done),
      },
      pulseBpm: {
        value: num(p.pulseBpm?.value, d.pulseBpm.value),
        done: bool(p.pulseBpm?.done, d.pulseBpm.done),
      },
      temperatureC: {
        value: num(p.temperatureC?.value, d.temperatureC.value),
        done: bool(p.temperatureC?.done, d.temperatureC.done),
      },
      spo2Percent: {
        value: num(p.spo2Percent?.value, d.spo2Percent.value),
        done: bool(p.spo2Percent?.done, d.spo2Percent.done),
      },
      weightKg: { value: weightValue, done: weightValue !== null && bool(p.weightKg?.done, true) },
      usualSleepHours: { value: sleepValue, done: sleepValue !== null && bool(p.usualSleepHours?.done, true) },
      moodScore: { value: moodValue, done: moodValue !== null && bool(p.moodScore?.done, true) },
    };
  } catch {
    return DEFAULT_DATA;
  }
}

/** Peso capturado en About You, usado solo como valor sugerido. */
function loadProfileWeight(): number | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as { weight?: unknown };
    return nullableNum(p.weight);
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/* Validacion de los valores editables                                        */
/* -------------------------------------------------------------------------- */

function parseDraft(key: EditableKey, draft: string): number | null {
  const n = Number(draft);
  if (draft.trim() === "" || !Number.isFinite(n)) return null;
  if (key === "weight") return n >= 20 && n <= 300 ? n : null;
  if (key === "sleep") return n > 0 && n <= 24 ? n : null;
  return Number.isInteger(n) && n >= 1 && n <= 5 ? n : null;
}

/* -------------------------------------------------------------------------- */
/* Subcomponentes                                                             */
/* -------------------------------------------------------------------------- */

function DoneMark() {
  return (
    <>
      <span aria-hidden="true">&#10003;</span> Done
    </>
  );
}

interface RowProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

function MeasureRow({ title, subtitle, children }: RowProps) {
  return (
    <li className="measure-row">
      <div className="measure-row__info">
        <p className="measure-row__title">{title}</p>
        <p className="measure-row__sub">{subtitle}</p>
      </div>
      <div className="measure-row__action">{children}</div>
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/* Pagina                                                                     */
/* -------------------------------------------------------------------------- */

export default function YourNormalValuesPage({
  onBack,
  onComplete,
}: YourNormalValuesPageProps) {
  const initial = useMemo(loadData, []);
  const profileWeight = useMemo(loadProfileWeight, []);

  const [data, setData] = useState<NormalValuesData>(initial);
  const [editing, setEditing] = useState<EditableKey | null>(null);
  const [draft, setDraft] = useState("");

  const doneCount =
    (data.bloodPressure.done && data.pulseBpm.done ? 1 : 0) +
    (data.temperatureC.done ? 1 : 0) +
    (data.spo2Percent.done ? 1 : 0) +
    (data.weightKg.done ? 1 : 0) +
    (data.usualSleepHours.done ? 1 : 0) +
    (data.moodScore.done ? 1 : 0);

  const startEditing = (key: EditableKey) => {
    let initialDraft = "";
    if (key === "weight") {
      const current = data.weightKg.value ?? profileWeight;
      initialDraft = current !== null ? String(current) : "";
    } else if (key === "sleep") {
      initialDraft = data.usualSleepHours.value !== null ? String(data.usualSleepHours.value) : "";
    } else {
      initialDraft = data.moodScore.value !== null ? String(data.moodScore.value) : "";
    }
    setDraft(initialDraft);
    setEditing(key);
  };

  const cancelEditing = () => {
    setEditing(null);
    setDraft("");
  };

  const saveEditing = () => {
    if (!editing) return;
    const value = parseDraft(editing, draft);
    if (value === null) return;
    setData((prev) => {
      if (editing === "weight") return { ...prev, weightKg: { value, done: true } };
      if (editing === "sleep") return { ...prev, usualSleepHours: { value, done: true } };
      return { ...prev, moodScore: { value, done: true } };
    });
    cancelEditing();
  };

  const canSave = editing !== null && parseDraft(editing, draft) !== null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      saveEditing();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelEditing();
    }
  };

  const handleContinue = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      /* almacenamiento no disponible */
    }
    onComplete();
  };

  /* Control derecho de una fila editable: editor inline, Done o Measure. */
  const renderAction = (key: EditableKey, done: boolean) => {
    if (editing === key) {
      return (
        <div className="measure-editor">
          {key === "mood" ? (
            <div className="mood-scale" role="group" aria-label="Mood from 1 to 5">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={"mood-scale__btn" + (draft === String(n) ? " mood-scale__btn--active" : "")}
                  aria-pressed={draft === String(n)}
                  onClick={() => setDraft(String(n))}
                >
                  {n}
                </button>
              ))}
            </div>
          ) : (
            <label className="measure-editor__field">
              <input
                className="field__input measure-editor__input"
                type="number"
                inputMode="decimal"
                autoFocus
                step={0.1}
                min={0}
                placeholder={key === "weight" ? "61.2" : "7.5"}
                aria-label={key === "weight" ? "Weight in kilograms" : "Usual sleep in hours"}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <span className="measure-editor__unit">{key === "weight" ? "kg" : "hrs"}</span>
            </label>
          )}
          <button type="button" className="btn btn--measure" disabled={!canSave} onClick={saveEditing}>
            Save
          </button>
          <button type="button" className="btn-text btn-text--plain measure-editor__cancel" onClick={cancelEditing}>
            Cancel
          </button>
        </div>
      );
    }

    if (done) {
      return (
        <button
          type="button"
          className="measure-done measure-done--button"
          title="Edit"
          onClick={() => startEditing(key)}
        >
          <DoneMark />
        </button>
      );
    }

    return (
      <button type="button" className="btn btn--measure" onClick={() => startEditing(key)}>
        Measure
      </button>
    );
  };

  return (
    <div className="page">
      <header className="consent__header">
        <div className="consent__brand">
          <span className="consent__logo">Maia</span>
          <span className="consent__context">Setup &middot; Space Mission</span>
        </div>
        <div className="setup-actions">
          <button
            type="button"
            className="setup-skip"
            title="Jump straight into the app with a sample astronaut profile (synthetic data)"
            onClick={() => window.dispatchEvent(new Event("maia-skip-setup"))}
          >
            Skip setup · demo
          </button>
          <span className="consent__step">
          Step {CURRENT_STEP} of {TOTAL_STEPS}
        </span>
        </div>
      </header>

      <div
        className="progress"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={TOTAL_STEPS}
        aria-valuenow={CURRENT_STEP}
      >
        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
          <span
            key={i}
            className={
              "progress__segment" +
              (i < CURRENT_STEP ? " progress__segment--active" : "")
            }
          />
        ))}
      </div>

      <main className="normal__body">
        <section className="normal__intro">
          <h1>
            Your Normal
            <br />
            Values
          </h1>
          <p>Maia learns what is normal for you, not just for everyone.</p>
        </section>

        <section className="card normal__card">
          <div className="measure-head">
            <h2 className="card__label measure-head__title">Your first measurements</h2>
            <span className="measure-head__count" aria-live="polite">
              {doneCount} of {TOTAL_MEASUREMENTS} done
            </span>
          </div>

          <ul className="measure-list">
            <MeasureRow
              title="Blood pressure and pulse"
              subtitle={`2 readings at rest \u00B7 ${data.bloodPressure.systolic}/${data.bloodPressure.diastolic} \u00B7 ${data.pulseBpm.value} bpm`}
            >
              <span className="measure-done">
                <DoneMark />
              </span>
            </MeasureRow>

            <MeasureRow title="Temperature" subtitle={`${data.temperatureC.value} \u00B0C`}>
              <span className="measure-done">
                <DoneMark />
              </span>
            </MeasureRow>

            <MeasureRow title="Oxygen (SpO&#8322;)" subtitle={`${data.spo2Percent.value}%`}>
              <span className="measure-done">
                <DoneMark />
              </span>
            </MeasureRow>

            <MeasureRow
              title="Weight"
              subtitle={
                data.weightKg.done && data.weightKg.value !== null
                  ? `${data.weightKg.value} kg`
                  : "Body mass measurement device"
              }
            >
              {renderAction("weight", data.weightKg.done)}
            </MeasureRow>

            <MeasureRow
              title="Usual sleep"
              subtitle={
                data.usualSleepHours.done && data.usualSleepHours.value !== null
                  ? `${data.usualSleepHours.value} hours per night`
                  : "How many hours you normally sleep"
              }
            >
              {renderAction("sleep", data.usualSleepHours.done)}
            </MeasureRow>

            <MeasureRow
              title="Mood"
              subtitle={
                data.moodScore.done && data.moodScore.value !== null
                  ? `${data.moodScore.value} / 5`
                  : "1 to 5, private"
              }
            >
              {renderAction("mood", data.moodScore.done)}
            </MeasureRow>
          </ul>

          <p className="about__note">
            Every measurement after today is compared with these values. You can
            finish the rest later.
          </p>
        </section>
      </main>

      <footer className="about__footer">
        <button type="button" className="btn btn--secondary" onClick={onBack}>
          Back
        </button>
        <button type="button" className="btn" onClick={handleContinue}>
          Continue
        </button>
      </footer>
    </div>
  );
}