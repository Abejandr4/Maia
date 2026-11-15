import { useMemo, useState } from "react";
import "../pages.css";

/* -------------------------------------------------------------------------- */
/* Tipos                                                                      */
/* -------------------------------------------------------------------------- */

export interface MedicalHistoryData {
  conditions: string[];
  allergies: string[];
  currentMedications: string;
  pastSurgeries: string;
  vaccinesUpToDate: boolean;
  wearsGlassesOrContacts: boolean;
  skipped?: boolean;
}

interface MedicalHistoryPageProps {
  onBack: () => void;
  onSkip: () => void;
  onComplete: () => void;
}

/* -------------------------------------------------------------------------- */
/* Constantes                                                                 */
/* -------------------------------------------------------------------------- */

const STORAGE_KEY = "medicalHistory";
const TOTAL_STEPS = 8;
const CURRENT_STEP = 3;
const NONE = "None";

const CONDITION_PRESETS = [
  NONE,
  "High blood pressure",
  "Asthma",
  "Migraine",
  "Kidney stones",
];
const ALLERGY_PRESETS = ["Penicillin", "Nuts", "Latex"];

const DEFAULT_DATA: MedicalHistoryData = {
  conditions: [],
  allergies: [],
  currentMedications: "",
  pastSurgeries: "",
  vaccinesUpToDate: false,
  wearsGlassesOrContacts: false,
};

/* -------------------------------------------------------------------------- */
/* Utilidades                                                                 */
/* -------------------------------------------------------------------------- */

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((v): v is string => typeof v === "string")
    : [];
}

function loadData(): MedicalHistoryData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_DATA;
    const p = JSON.parse(raw) as Partial<MedicalHistoryData>;
    return {
      conditions: stringArray(p.conditions),
      allergies: stringArray(p.allergies),
      currentMedications:
        typeof p.currentMedications === "string" ? p.currentMedications : "",
      pastSurgeries: typeof p.pastSurgeries === "string" ? p.pastSurgeries : "",
      vaccinesUpToDate: p.vaccinesUpToDate === true,
      wearsGlassesOrContacts: p.wearsGlassesOrContacts === true,
    };
  } catch {
    return DEFAULT_DATA;
  }
}

function includesIgnoreCase(list: string[], value: string): boolean {
  return list.some((item) => item.toLowerCase() === value.toLowerCase());
}

/* -------------------------------------------------------------------------- */
/* Subcomponentes                                                             */
/* -------------------------------------------------------------------------- */

function InfoIcon() {
  return (
    <svg
      className="banner__icon"
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="10" cy="10" r="8.25" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 9v5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="10" cy="6.2" r="1" fill="currentColor" />
    </svg>
  );
}

interface ChipGroupProps {
  title: string;
  presets: string[];
  selected: string[];
  onToggle: (value: string) => void;
  onAddCustom: (value: string) => void;
}

function ChipGroup({
  title,
  presets,
  selected,
  onToggle,
  onAddCustom,
}: ChipGroupProps) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  const customItems = selected.filter((item) => !includesIgnoreCase(presets, item));

  const commit = () => {
    const value = draft.trim();
    if (value) onAddCustom(value);
    setDraft("");
    setAdding(false);
  };

  const cancel = () => {
    setDraft("");
    setAdding(false);
  };

  return (
    <div className="chip-section">
      <h2 className="card__label">{title}</h2>
      <div className="chip-list">
        {presets.map((item) => {
          const active = selected.includes(item);
          return (
            <button
              key={item}
              type="button"
              className={"chip" + (active ? " chip--active" : "")}
              aria-pressed={active}
              onClick={() => onToggle(item)}
            >
              {item}
            </button>
          );
        })}

        {customItems.map((item) => (
          <button
            key={item}
            type="button"
            className="chip chip--active chip--custom"
            aria-pressed="true"
            title="Remove"
            onClick={() => onToggle(item)}
          >
            {item}
            <span className="chip__remove" aria-hidden="true">
              &times;
            </span>
          </button>
        ))}

        {adding ? (
          <input
            className="chip-input"
            type="text"
            autoFocus
            placeholder="Type and press Enter"
            value={draft}
            aria-label={`Add other ${title.toLowerCase()}`}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commit();
              } else if (e.key === "Escape") {
                e.preventDefault();
                cancel();
              }
            }}
          />
        ) : (
          <button
            type="button"
            className="chip chip--add"
            onClick={() => setAdding(true)}
          >
            + Other
          </button>
        )}
      </div>
    </div>
  );
}

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

export default function MedicalHistoryPage({
  onBack,
  onSkip,
  onComplete,
}: MedicalHistoryPageProps) {
  const initial = useMemo(loadData, []);

  const [conditions, setConditions] = useState<string[]>(initial.conditions);
  const [allergies, setAllergies] = useState<string[]>(initial.allergies);
  const [currentMedications, setCurrentMedications] = useState(
    initial.currentMedications
  );
  const [pastSurgeries, setPastSurgeries] = useState(initial.pastSurgeries);
  const [vaccinesUpToDate, setVaccinesUpToDate] = useState(
    initial.vaccinesUpToDate
  );
  const [wearsGlassesOrContacts, setWearsGlassesOrContacts] = useState(
    initial.wearsGlassesOrContacts
  );

  /* Conditions: "None" es excluyente con cualquier otra condicion. */
  const toggleCondition = (value: string) => {
    setConditions((prev) => {
      if (value === NONE) {
        return prev.includes(NONE) ? [] : [NONE];
      }
      const without = prev.filter((c) => c !== NONE);
      return without.includes(value)
        ? without.filter((c) => c !== value)
        : [...without, value];
    });
  };

  const addCondition = (value: string) => {
    setConditions((prev) => {
      const without = prev.filter((c) => c !== NONE);
      return includesIgnoreCase(without, value) ? without : [...without, value];
    });
  };

  const toggleAllergy = (value: string) => {
    setAllergies((prev) =>
      prev.includes(value) ? prev.filter((a) => a !== value) : [...prev, value]
    );
  };

  const addAllergy = (value: string) => {
    setAllergies((prev) =>
      includesIgnoreCase(prev, value) ? prev : [...prev, value]
    );
  };

  const persist = (skipped: boolean) => {
    const data: MedicalHistoryData = {
      conditions,
      allergies,
      currentMedications: currentMedications.trim(),
      pastSurgeries: pastSurgeries.trim(),
      vaccinesUpToDate,
      wearsGlassesOrContacts,
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

      <main className="medical__body">
        <section className="medical__intro">
          <h1>Medical History</h1>
          <p>
            Some conditions change what is risky for you. You can skip this and
            finish it later.
          </p>
        </section>

        <section className="card medical__card">
          <div className="banner" role="note">
            <InfoIcon />
            <span>Your medical team can pre-fill this section.</span>
          </div>

          <ChipGroup
            title="Conditions"
            presets={CONDITION_PRESETS}
            selected={conditions}
            onToggle={toggleCondition}
            onAddCustom={addCondition}
          />

          <ChipGroup
            title="Allergies"
            presets={ALLERGY_PRESETS}
            selected={allergies}
            onToggle={toggleAllergy}
            onAddCustom={addAllergy}
          />

          <div className="medical__row">
            <Field label="Current medications" htmlFor="currentMedications">
              <input
                id="currentMedications"
                className="field__input"
                type="text"
                placeholder="e.g. none"
                value={currentMedications}
                onChange={(e) => setCurrentMedications(e.target.value)}
              />
            </Field>

            <Field label="Past surgeries" htmlFor="pastSurgeries">
              <input
                id="pastSurgeries"
                className="field__input"
                type="text"
                placeholder="e.g. appendix, 2015"
                value={pastSurgeries}
                onChange={(e) => setPastSurgeries(e.target.value)}
              />
            </Field>
          </div>

          <div className="medical__checks">
            <label className="check">
              <input
                type="checkbox"
                checked={vaccinesUpToDate}
                onChange={(e) => setVaccinesUpToDate(e.target.checked)}
              />
              <span className="check__box" aria-hidden="true" />
              <span className="check__text">Vaccines up to date</span>
            </label>

            <label className="check">
              <input
                type="checkbox"
                checked={wearsGlassesOrContacts}
                onChange={(e) => setWearsGlassesOrContacts(e.target.checked)}
              />
              <span className="check__box" aria-hidden="true" />
              <span className="check__text">I wear glasses or contact lenses</span>
            </label>
          </div>
        </section>
      </main>

      <footer className="about__footer">
        <button type="button" className="btn btn--secondary" onClick={onBack}>
          Back
        </button>
        <div className="medical__actions">
          <button type="button" className="btn-text" onClick={handleSkip}>
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