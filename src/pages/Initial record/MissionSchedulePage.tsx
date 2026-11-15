import { useMemo, useState } from "react";
import "../pages.css";

/* -------------------------------------------------------------------------- */
/* Tipos                                                                      */
/* -------------------------------------------------------------------------- */

export type CurrentLocation = "iss" | "spacewalk" | "earth" | "lunar" | "mars";

/**
 * Configuracion de mision y horario. Los modulos Environment, Home (alertas
 * de fatiga y circadiano) y Report pueden leerla desde localStorage
 * ("missionSchedule").
 */
export interface MissionScheduleData {
  missionType: string;
  duration: string;
  currentLocation: CurrentLocation;
  bedtimeGmt: string;
  wakeupTimeGmt: string;
}

interface MissionSchedulePageProps {
  onBack: () => void;
  onComplete: () => void;
}

interface LocationOption {
  id: CurrentLocation;
  title: string;
  subtitle: string;
  preview?: boolean;
}

/* -------------------------------------------------------------------------- */
/* Constantes                                                                 */
/* -------------------------------------------------------------------------- */

const STORAGE_KEY = "missionSchedule";
const TOTAL_STEPS = 8;
const CURRENT_STEP = 6;

const LOCATION_OPTIONS: LocationOption[] = [
  { id: "iss", title: "On the ISS", subtitle: "Microgravity" },
  { id: "spacewalk", title: "Spacewalk", subtitle: "Suit" },
  { id: "earth", title: "Back on Earth", subtitle: "1 g" },
  { id: "lunar", title: "Lunar Surface", subtitle: "1/6 g", preview: true },
  { id: "mars", title: "Mars Transit", subtitle: "Long delay", preview: true },
];

const DEFAULT_DATA: MissionScheduleData = {
  missionType: "ISS Expedition 74",
  duration: "6 months",
  currentLocation: "iss",
  bedtimeGmt: "22:00",
  wakeupTimeGmt: "06:00",
};

/* -------------------------------------------------------------------------- */
/* Utilidades                                                                 */
/* -------------------------------------------------------------------------- */

function isLocation(value: unknown): value is CurrentLocation {
  return LOCATION_OPTIONS.some((o) => o.id === value);
}

function isTime(value: unknown): value is string {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function loadData(): MissionScheduleData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_DATA;
    const p = JSON.parse(raw) as Partial<MissionScheduleData>;
    return {
      missionType:
        typeof p.missionType === "string" ? p.missionType : DEFAULT_DATA.missionType,
      duration: typeof p.duration === "string" ? p.duration : DEFAULT_DATA.duration,
      currentLocation: isLocation(p.currentLocation)
        ? p.currentLocation
        : DEFAULT_DATA.currentLocation,
      bedtimeGmt: isTime(p.bedtimeGmt) ? p.bedtimeGmt : DEFAULT_DATA.bedtimeGmt,
      wakeupTimeGmt: isTime(p.wakeupTimeGmt)
        ? p.wakeupTimeGmt
        : DEFAULT_DATA.wakeupTimeGmt,
    };
  } catch {
    return DEFAULT_DATA;
  }
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

export default function MissionSchedulePage({
  onBack,
  onComplete,
}: MissionSchedulePageProps) {
  const initial = useMemo(loadData, []);
  const [data, setData] = useState<MissionScheduleData>(initial);

  const setField =
    <K extends keyof MissionScheduleData>(key: K) =>
    (value: MissionScheduleData[K]) =>
      setData((prev) => ({ ...prev, [key]: value }));

  const handleContinue = () => {
    const clean: MissionScheduleData = {
      missionType: data.missionType.trim() || DEFAULT_DATA.missionType,
      duration: data.duration.trim() || DEFAULT_DATA.duration,
      currentLocation: data.currentLocation,
      bedtimeGmt: isTime(data.bedtimeGmt) ? data.bedtimeGmt : DEFAULT_DATA.bedtimeGmt,
      wakeupTimeGmt: isTime(data.wakeupTimeGmt)
        ? data.wakeupTimeGmt
        : DEFAULT_DATA.wakeupTimeGmt,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
    } catch {
      /* almacenamiento no disponible */
    }
    onComplete();
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

      <main className="mission__body">
        <section className="mission__intro">
          <h1>Mission &amp; Schedule</h1>
          <p>Where you are and when you sleep.</p>
        </section>

        <section className="card mission__card">
          <div className="mission__row">
            <Field label="Mission type" htmlFor="missionType">
              <input
                id="missionType"
                className="field__input"
                type="text"
                placeholder="ISS Expedition 74"
                value={data.missionType}
                onChange={(e) => setField("missionType")(e.target.value)}
              />
            </Field>

            <Field label="Duration" htmlFor="duration">
              <input
                id="duration"
                className="field__input"
                type="text"
                placeholder="6 months"
                value={data.duration}
                onChange={(e) => setField("duration")(e.target.value)}
              />
            </Field>
          </div>

          <div className="location-section">
            <h2 className="card__label">Where are you now?</h2>
            <div className="location-grid" role="radiogroup" aria-label="Where are you now?">
              {LOCATION_OPTIONS.map((opt) => {
                const active = data.currentLocation === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    className={"location-card" + (active ? " location-card--active" : "")}
                    onClick={() => setField("currentLocation")(opt.id)}
                  >
                    <span className="location-card__title">{opt.title}</span>
                    {opt.preview && <span className="location-card__badge">Preview</span>}
                    <span className="location-card__sub">{opt.subtitle}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mission__row">
            <Field label="Bedtime (GMT)" htmlFor="bedtimeGmt">
              <input
                id="bedtimeGmt"
                className="field__input"
                type="time"
                value={data.bedtimeGmt}
                onChange={(e) => setField("bedtimeGmt")(e.target.value)}
              />
            </Field>

            <Field label="Wake-up time (GMT)" htmlFor="wakeupTimeGmt">
              <input
                id="wakeupTimeGmt"
                className="field__input"
                type="time"
                value={data.wakeupTimeGmt}
                onChange={(e) => setField("wakeupTimeGmt")(e.target.value)}
              />
            </Field>
          </div>

          <p className="about__note">
            Maia uses your schedule to warn you about the hours when you are most
            tired.
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