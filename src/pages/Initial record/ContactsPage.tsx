import { useMemo, useState } from "react";
import "../pages.css";

/* -------------------------------------------------------------------------- */
/* Tipos                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Contactos de emergencia. El sistema de alertas (EmergencyScreen / Shell)
 * puede leerlos desde localStorage ("emergencyContacts").
 */
export interface EmergencyContactsData {
  flightSurgeon: { name: string; channel: string };
  crewMedicalOfficer: { name: string; onBoard: string };
  earthContact: { name: string; phone: string };
}

interface ContactsPageProps {
  onBack: () => void;
  onSkip: () => void;
  onComplete: () => void;
}

/* -------------------------------------------------------------------------- */
/* Constantes                                                                 */
/* -------------------------------------------------------------------------- */

const STORAGE_KEY = "emergencyContacts";
const TOTAL_STEPS = 8;
const CURRENT_STEP = 8;
const ON_BOARD_OPTIONS = ["Yes", "No"];

const DEFAULT_DATA: EmergencyContactsData = {
  flightSurgeon: { name: "Dr. L. Moreno", channel: "Mission Control \u00B7 medical loop" },
  crewMedicalOfficer: { name: "K. Tanaka", onBoard: "Yes" },
  earthContact: { name: "Luc\u00EDa Ruiz (daughter)", phone: "" },
};

/* -------------------------------------------------------------------------- */
/* Utilidades                                                                 */
/* -------------------------------------------------------------------------- */

function str(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function loadData(): EmergencyContactsData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_DATA;
    const p = JSON.parse(raw) as Partial<EmergencyContactsData>;
    const d = DEFAULT_DATA;
    const onBoard = str(p.crewMedicalOfficer?.onBoard, d.crewMedicalOfficer.onBoard);
    return {
      flightSurgeon: {
        name: str(p.flightSurgeon?.name, d.flightSurgeon.name),
        channel: str(p.flightSurgeon?.channel, d.flightSurgeon.channel),
      },
      crewMedicalOfficer: {
        name: str(p.crewMedicalOfficer?.name, d.crewMedicalOfficer.name),
        onBoard: ON_BOARD_OPTIONS.includes(onBoard) ? onBoard : d.crewMedicalOfficer.onBoard,
      },
      earthContact: {
        name: str(p.earthContact?.name, d.earthContact.name),
        phone: str(p.earthContact?.phone, d.earthContact.phone),
      },
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

export default function ContactsPage({ onBack, onSkip, onComplete }: ContactsPageProps) {
  const initial = useMemo(loadData, []);
  const [data, setData] = useState<EmergencyContactsData>(initial);

  const handleFinish = () => {
    const clean: EmergencyContactsData = {
      flightSurgeon: {
        name: data.flightSurgeon.name.trim(),
        channel: data.flightSurgeon.channel.trim(),
      },
      crewMedicalOfficer: {
        name: data.crewMedicalOfficer.name.trim(),
        onBoard: data.crewMedicalOfficer.onBoard,
      },
      earthContact: {
        name: data.earthContact.name.trim(),
        phone: data.earthContact.phone.trim(),
      },
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

      <main className="contacts__body">
        <section className="contacts__intro">
          <h1>Contacts</h1>
          <p>Who Maia alerts when something is red.</p>
        </section>

        <section className="card contacts__card">
          <div className="contacts__section">
            <h2 className="card__label">Flight surgeon</h2>
            <div className="contacts__row">
              <Field label="Name" htmlFor="surgeonName">
                <input
                  id="surgeonName"
                  className="field__input"
                  type="text"
                  value={data.flightSurgeon.name}
                  onChange={(e) =>
                    setData((p) => ({
                      ...p,
                      flightSurgeon: { ...p.flightSurgeon, name: e.target.value },
                    }))
                  }
                />
              </Field>
              <Field label="Channel" htmlFor="surgeonChannel">
                <input
                  id="surgeonChannel"
                  className="field__input"
                  type="text"
                  value={data.flightSurgeon.channel}
                  onChange={(e) =>
                    setData((p) => ({
                      ...p,
                      flightSurgeon: { ...p.flightSurgeon, channel: e.target.value },
                    }))
                  }
                />
              </Field>
            </div>
          </div>

          <div className="contacts__section">
            <h2 className="card__label">Crew medical officer</h2>
            <div className="contacts__row">
              <Field label="Name" htmlFor="cmoName">
                <input
                  id="cmoName"
                  className="field__input"
                  type="text"
                  value={data.crewMedicalOfficer.name}
                  onChange={(e) =>
                    setData((p) => ({
                      ...p,
                      crewMedicalOfficer: { ...p.crewMedicalOfficer, name: e.target.value },
                    }))
                  }
                />
              </Field>
              <Field label="On board" htmlFor="cmoOnBoard">
                <select
                  id="cmoOnBoard"
                  className="field__input field__select"
                  value={data.crewMedicalOfficer.onBoard}
                  onChange={(e) =>
                    setData((p) => ({
                      ...p,
                      crewMedicalOfficer: { ...p.crewMedicalOfficer, onBoard: e.target.value },
                    }))
                  }
                >
                  {ON_BOARD_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </div>

          <div className="contacts__section">
            <h2 className="card__label">Emergency contact on Earth</h2>
            <div className="contacts__row">
              <Field label="Name" htmlFor="earthName">
                <input
                  id="earthName"
                  className="field__input"
                  type="text"
                  value={data.earthContact.name}
                  onChange={(e) =>
                    setData((p) => ({
                      ...p,
                      earthContact: { ...p.earthContact, name: e.target.value },
                    }))
                  }
                />
              </Field>
              <Field label="Phone" htmlFor="earthPhone">
                <input
                  id="earthPhone"
                  className="field__input"
                  type="tel"
                  inputMode="tel"
                  placeholder="+52 ..."
                  value={data.earthContact.phone}
                  onChange={(e) =>
                    setData((p) => ({
                      ...p,
                      earthContact: { ...p.earthContact, phone: e.target.value },
                    }))
                  }
                />
              </Field>
            </div>
          </div>

          <p className="about__note">
            Maia alerts the right person automatically, depending on where you are
            and how serious it is.
          </p>
        </section>
      </main>

      <footer className="about__footer">
        <button type="button" className="btn btn--secondary" onClick={onBack}>
          Back
        </button>
        <div className="medical__actions">
          <button type="button" className="btn-text btn-text--plain" onClick={onSkip}>
            Skip for now
          </button>
          <button type="button" className="btn" onClick={handleFinish}>
            Finish setup
          </button>
        </div>
      </footer>
    </div>
  );
}