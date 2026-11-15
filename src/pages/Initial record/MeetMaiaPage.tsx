import "../pages.css";

/* -------------------------------------------------------------------------- */
/* Tipos                                                                      */
/* -------------------------------------------------------------------------- */

interface MeetMaiaPageProps {
  onBack: () => void;
  onComplete: () => void;
  /**
   * Animacion o componente de Maia. Si no se pasa, se muestra un placeholder.
   * Ejemplo: <MeetMaiaPage animationSlot={<MaiaAnimation />} ... />
   */
  animationSlot?: React.ReactNode;
}

/* -------------------------------------------------------------------------- */
/* Constantes                                                                 */
/* -------------------------------------------------------------------------- */

const STORAGE_KEY = "hasMetMaia";
const TOTAL_STEPS = 8;
const CURRENT_STEP = 7;

/* -------------------------------------------------------------------------- */
/* Pagina                                                                     */
/* -------------------------------------------------------------------------- */

export default function MeetMaiaPage({
  onBack,
  onComplete,
  animationSlot,
}: MeetMaiaPageProps) {
  const handleContinue = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "true");
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

      <main className="maia__body">
        <section className="maia__intro">
          <h1>Meet Maia</h1>
          <p>Your companion for healthy habits.</p>
        </section>

        <section className="card maia__card">
          <div className="maia__content">
            {/* ------------------------------------------------------------ */}
            {/* ESPACIO RESERVADO PARA LA ANIMACION DE MAIA                  */}
            {/*                                                              */}
            {/* PARA LA COMPANERA DEL EQUIPO:                                */}
            {/*  - Pasa tu componente con la prop `animationSlot`, o         */}
            {/*    reemplaza el placeholder de abajo directamente.           */}
            {/*  - El contenedor mide 200px x 200px y se centra solo.        */}
            {/* ------------------------------------------------------------ */}
            <div className="maia__animation-slot">
              {animationSlot ?? (
                <>
                  {/* TODO: Insertar aqui el componente o animacion de Maia */}
                  <span className="maia__animation-placeholder">Maia Animation</span>
                </>
              )}
            </div>

            <div className="maia__text">
              <p className="maia__bubble">Hi, I&apos;m Maia!</p>
              <p className="maia__paragraph">
                I&apos;ll keep you company and cheer on your habits: water, sleep
                and your daily measurements.
              </p>
              <p className="maia__paragraph">
                I never judge your health values. The colors and alerts do that.
              </p>
            </div>
          </div>
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