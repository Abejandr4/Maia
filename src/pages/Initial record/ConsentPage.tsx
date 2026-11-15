import { useState } from "react";
import { DEMO_CONSENT } from "../../utils/demoProfile";
import "../pages.css";

const TOTAL_STEPS = 8;
const CURRENT_STEP = 1;

type Access = boolean;

interface Row {
  data: string;
  you: Access;
  cmo: Access;
  surgeon: Access;
}

const ROWS: Row[] = [
  { data: "Vital signs", you: true, cmo: true, surgeon: true },
  { data: "Alerts and incident reports", you: true, cmo: true, surgeon: true },
  { data: "Cognitive Questionnaires", you: true, cmo: false, surgeon: true },
];

function AccessMark({ allowed }: { allowed: Access }) {
  return allowed ? (
    <span className="access access--yes" aria-label="Can see">
      &#10003;
    </span>
  ) : (
    <span className="access access--no" aria-label="Cannot see">
      &mdash;
    </span>
  );
}

interface ConsentPageProps {
  onComplete: () => void;
}

export default function ConsentPage({ onComplete }: ConsentPageProps) {
  const [storeLocal, setStoreLocal] = useState(false);
  const [shareTeam, setShareTeam] = useState(false);

  const canContinue = storeLocal && shareTeam;

  const handleContinue = () => {
    if (!canContinue) return;
    try {
      localStorage.setItem("userConsent", JSON.stringify({ storeLocal, shareTeam }));
    } catch {
      /* storage unavailable */
    }
    onComplete();
  };

  return (
    <div className="page consent">
      <header className="consent__header">
        <div className="consent__brand">
          <span className="consent__logo">Maia</span>
          <span className="consent__context">Setup &middot; Space Mission</span>
        </div>
        <div className="setup-actions">
          <button
          type="button"
          className="btn btn--secondary btn--small"
          onClick={() => {
            setStoreLocal(DEMO_CONSENT.storeLocal);
            setShareTeam(DEMO_CONSENT.shareTeam);
          }}
  >
    Autofill demo
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

      <main className="consent__body">
        <section className="consent__intro">
          <h1>Privacy &amp; Consent</h1>
          <p>Before we start: what Maia does with your data and who can see it.</p>
        </section>

        <section className="card consent__card">
          <h2 className="card__label">Maia does</h2>
          <p className="card__text">
            Guides you to measure, explains the result with a color and tells you
            what to do. It works without a connection.
          </p>

          <h2 className="card__label">Maia does not</h2>
          <p className="card__text">
            Diagnose or replace your medical team. It supports your decisions.
          </p>

          <h2 className="card__label">Who can see what</h2>
          <table className="access-table">
            <thead>
              <tr>
                <th scope="col">Data</th>
                <th scope="col">You</th>
                <th scope="col">Crew Medical Officer</th>
                <th scope="col">Flight Surgeon</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.data}>
                  <th scope="row">{row.data}</th>
                  <td>
                    <AccessMark allowed={row.you} />
                  </td>
                  <td>
                    <AccessMark allowed={row.cmo} />
                  </td>
                  <td>
                    <AccessMark allowed={row.surgeon} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="checks">
            <label className="check">
              <input
                type="checkbox"
                checked={storeLocal}
                onChange={(e) => setStoreLocal(e.target.checked)}
              />
              <span className="check__box" aria-hidden="true" />
              <span className="check__text">
                I agree that Maia stores my health data on this device.
              </span>
            </label>

            <label className="check">
              <input
                type="checkbox"
                checked={shareTeam}
                onChange={(e) => setShareTeam(e.target.checked)}
              />
              <span className="check__box" aria-hidden="true" />
              <span className="check__text">
                I agree to send alerts and reports to my medical team.
              </span>
            </label>
          </div>
        </section>
      </main>

      <footer className="consent__footer">
        <button
          type="button"
          className="btn consent__btn"
          disabled={!canContinue}
          onClick={handleContinue}
        >
          Continue
        </button>
      </footer>
    </div>
  );
}