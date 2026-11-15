import { useMemo, useState } from "react";
import "../pages.css";

/* -------------------------------------------------------------------------- */
/* Tipos                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Datos del historial de vuelo. `accumulatedRadiationMsv` es la linea base
 * que usaran los modulos de Radiation & Environment.
 */
export interface FlightHistoryData {
  previousMissions: number;
  totalDaysInSpace: number;
  accumulatedRadiationMsv: number;
  spacewalks: number;
  skipped?: boolean;
}

interface FlightHistoryPageProps {
  onBack: () => void;
  onSkip: () => void;
  onComplete: () => void;
}

/* -------------------------------------------------------------------------- */
/* Constantes                                                                 */
/* -------------------------------------------------------------------------- */

const STORAGE_KEY = "flightHistory";
const TOTAL_STEPS = 8;
const CURRENT_STEP = 4;

/** Los campos se manejan como texto para permitir dejarlos vacios mientras se edita. */
interface FormState {
  previousMissions: string;
  totalDaysInSpace: string;
  accumulatedRadiationMsv: string;
  spacewalks: string;
}

const EMPTY_FORM: FormState = {
  previousMissions: "",
  totalDaysInSpace: "",
  accumulatedRadiationMsv: "",
  spacewalks: "",
};

/* -------------------------------------------------------------------------- */
/* Utilidades                                                                 */
/* -------------------------------------------------------------------------- */

function toField(value: unknown): string {
  return typeof value === "number" && Number.isFinite(value) ? String(value) : "";
}

function loadForm(): FormState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_FORM;
    const p = JSON.parse(raw) as Partial<FlightHistoryData>;
    return {
      previousMissions: toField(p.previousMissions),
      totalDaysInSpace: toField(p.totalDaysInSpace),
      accumulatedRadiationMsv: toField(p.accumulatedRadiationMsv),
      spacewalks: toField(p.spacewalks),
    };
  } catch {
    return EMPTY_FORM;
  }
}

/** Convierte texto a numero valido y no negativo; vacio o invalido devuelve 0. */
function toNumber(value: string, integer: boolean): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return integer ? Math.trunc(n) : n;
}

/* -------------------------------------------------------------------------- */
/* Subcomponentes                                                             */
/* -------------------------------------------------------------------------- */

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="field">
      <label className="field__label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Pagina                                                                     */
/* -------------------------------------------------------------------------- */

export default function FlightHistoryPage({
  onBack,
  onSkip,
  onComplete,
}: FlightHistoryPageProps) {
  const initial = useMemo(loadForm, []);
  const [form, setForm] = useState<FormState>(initial);

  const update =
    (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const persist = (skipped: boolean) => {
    const data: FlightHistoryData = {
      previousMissions: toNumber(form.previousMissions, true),
      totalDaysInSpace: toNumber(form.totalDaysInSpace, true),
      accumulatedRadiationMsv: toNumber(form.accumulatedRadiationMsv, false),
      spacewalks: toNumber(form.spacewalks, true),
      skipped,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      /* almacenamiento no disponible */
    }
  };

  const handleContinue = () => {
    persist(false);
    onComplete();
  };

  const handleSkip = () => {
    persist(true);
    onSkip();
  };

  return (
    <div className="page">
      <header className="consent__header">
        <div className="consent__brand">
          <span className="consent__logo">Maia</span>
          <span className="consent__context">Setup &middot; Space Mission</span>
        </div>
        <span className="consent__step">
          Step {CURRENT_STEP} of {TOTAL_STEPS}
        </span>
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

      <main className="flight__body">
        <section className="flight__intro">
          <h1>Flight History</h1>
          <p>Your time in space so far. Only for Space Mission.</p>
        </section>

        <section className="card flight__card">
          <div className="flight__grid">
            <Field label="Previous missions" htmlFor="previousMissions">
              <input
                id="previousMissions"
                className="field__input"
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                placeholder="1"
                value={form.previousMissions}
                onChange={update("previousMissions")}
              />
            </Field>

            <Field label="Total days in space" htmlFor="totalDaysInSpace">
              <input
                id="totalDaysInSpace"
                className="field__input"
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                placeholder="186"
                value={form.totalDaysInSpace}
                onChange={update("totalDaysInSpace")}
              />
            </Field>

            <Field
              label="Accumulated radiation (mSv)"
              htmlFor="accumulatedRadiationMsv"
            >
              <input
                id="accumulatedRadiationMsv"
                className="field__input"
                type="number"
                inputMode="decimal"
                min={0}
                step={0.1}
                placeholder="92.4"
                value={form.accumulatedRadiationMsv}
                onChange={update("accumulatedRadiationMsv")}
              />
            </Field>

            <Field label="Spacewalks" htmlFor="spacewalks">
              <input
                id="spacewalks"
                className="field__input"
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                placeholder="2"
                value={form.spacewalks}
                onChange={update("spacewalks")}
              />
            </Field>
          </div>

          <p className="about__note">
            Your accumulated dose is the starting point for Radiation &amp;
            Environment.
          </p>
        </section>
      </main>

      <footer className="about__footer">
        <button type="button" className="btn btn--secondary" onClick={onBack}>
          Back
        </button>
        <div className="medical__actions">
          <button
            type="button"
            className="btn-text btn-text--plain"
            onClick={handleSkip}
          >
            Skip for now
          </button>
          <button type="button" className="btn" onClick={handleContinue}>
            Continue
          </button>
        </div>
      </footer>
    </div>
  );
}
