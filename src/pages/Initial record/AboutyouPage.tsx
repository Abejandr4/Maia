import { useMemo, useState } from "react";
import "../pages.css";

/* -------------------------------------------------------------------------- */
/* Tipos                                                                      */
/* -------------------------------------------------------------------------- */

type Sex = "Female" | "Male" | "Other";
type SexCategory = "female" | "male" | "neutral";

interface AvatarOption {
  /** Identificador estable. Es el valor que se guarda en localStorage. */
  id: string;
  /** Nombre legible (tooltip y accesibilidad). */
  label: string;
  /** Categoria usada para filtrar segun el campo Sex. */
  sexCategory: SexCategory;
  /** Ruta de la imagen o SVG (ej. "/avatars/female-1.svg"). */
  src: string;
}

interface AvatarStyle {
  id: string;
  label: string;
  /** Color de fondo circular. */
  color: string;
}

interface StoredProfile {
  fullName: string;
  age: number;
  sex: Sex;
  crewRole: string;
  height: number;
  weight: number;
  avatarId: string;
  avatarStyle: string;
}

interface AboutYouPageProps {
  onBack: () => void;
  onComplete: () => void;
}

/* -------------------------------------------------------------------------- */
/* Placeholders SVG temporales                                                */
/* Se generan en linea para que la pantalla funcione sin assets. Una vez que  */
/* existan los archivos reales, basta con reemplazar el valor de `src` en     */
/* AVATAR_OPTIONS y se puede borrar esta funcion.                             */
/* -------------------------------------------------------------------------- */

function placeholder(hair: string): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">` +
    `<path d="M16 100 Q16 68 50 68 Q84 68 84 100Z" fill="#3b3b3b"/>` +
    `<circle cx="50" cy="42" r="17" fill="#4a4a4a"/>` +
    `<g fill="#1f1f1f">${hair}</g>` +
    `</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const HAIR_SHORT = `<path d="M32 40 Q32 21 50 21 Q68 21 68 40 Q60 30 50 30 Q40 30 32 40Z"/>`;
const HAIR_LONG = `<path d="M31 46 Q27 18 50 18 Q73 18 69 46 L69 66 L61 66 L61 40 Q50 31 39 40 L39 66 L31 66Z"/>`;
const HAIR_BUN = `<path d="M32 40 Q32 21 50 21 Q68 21 68 40 Q60 30 50 30 Q40 30 32 40Z"/><circle cx="50" cy="15" r="7"/>`;
const HAIR_CROP = `<path d="M34 36 Q36 24 50 24 Q64 24 66 36 Q50 30 34 36Z"/>`;
const HAIR_CURLY = `<circle cx="36" cy="34" r="8"/><circle cx="50" cy="28" r="9"/><circle cx="64" cy="34" r="8"/>`;
const HAIR_NONE = ``;

/* -------------------------------------------------------------------------- */
/* CONFIGURACION DE AVATARES                                                  */
/*                                                                            */
/* PARA LA COMPANERA DEL EQUIPO:                                              */
/*  - Reemplaza cada `src` por la ruta de tu imagen o SVG real, por ejemplo   */
/*    src: "/avatars/female-1.svg" (archivos dentro de /public/avatars/).     */
/*  - Usa fondos transparentes: el color de fondo circular lo pone el estilo  */
/*    elegido por el usuario (AVATAR_STYLES).                                 */
/*  - Puedes agregar o quitar avatares libremente. Mantén `id` unico y        */
/*    estable, porque se guarda en localStorage.                              */
/*  - sexCategory controla cuando aparece cada avatar:                        */
/*      "female"  -> Female                                                   */
/*      "male"    -> Male                                                     */
/*      "neutral" -> Female, Male y Other                                     */
/*    Si el sexo es Other se muestran todos.                                  */
/* -------------------------------------------------------------------------- */

const AVATAR_OPTIONS: AvatarOption[] = [
  { id: "female-1", label: "Female 1", sexCategory: "female", src: placeholder(HAIR_LONG) },
  { id: "female-2", label: "Female 2", sexCategory: "female", src: placeholder(HAIR_BUN) },
  { id: "female-3", label: "Female 3", sexCategory: "female", src: placeholder(HAIR_CURLY) },
  { id: "male-1", label: "Male 1", sexCategory: "male", src: placeholder(HAIR_SHORT) },
  { id: "male-2", label: "Male 2", sexCategory: "male", src: placeholder(HAIR_CROP) },
  { id: "male-3", label: "Male 3", sexCategory: "male", src: placeholder(HAIR_NONE) },
  { id: "neutral-1", label: "Neutral 1", sexCategory: "neutral", src: placeholder(HAIR_CROP) },
  { id: "neutral-2", label: "Neutral 2", sexCategory: "neutral", src: placeholder(HAIR_CURLY) },
];

/* Estilos de fondo circular. Agrega o cambia colores aqui. */
const AVATAR_STYLES: AvatarStyle[] = [
  { id: "lilac", label: "Lilac", color: "#debcf7" },
  { id: "space-blue", label: "Space blue", color: "#8fa3e8" },
  { id: "mint", label: "Mint", color: "#bfe8d4" },
  { id: "amber", label: "Amber", color: "#f5d58a" },
];

/* -------------------------------------------------------------------------- */
/* Constantes y utilidades                                                    */
/* -------------------------------------------------------------------------- */

const PROFILE_KEY = "userProfile";
const TOTAL_STEPS = 8;
const CURRENT_STEP = 2;
const SEX_OPTIONS: Sex[] = ["Female", "Male", "Other"];

function isSex(value: unknown): value is Sex {
  return value === "Female" || value === "Male" || value === "Other";
}

/** Devuelve los avatares validos para el sexo indicado. */
function getAvatarsForSex(sex: Sex): AvatarOption[] {
  if (sex === "Other") return AVATAR_OPTIONS;
  const category: SexCategory = sex === "Female" ? "female" : "male";
  return AVATAR_OPTIONS.filter(
    (a) => a.sexCategory === category || a.sexCategory === "neutral"
  );
}

function loadProfile(): Partial<StoredProfile> {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? (JSON.parse(raw) as Partial<StoredProfile>) : {};
  } catch {
    return {};
  }
}

function toText(value: unknown): string {
  return value === undefined || value === null ? "" : String(value);
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

export default function AboutYouPage({ onBack, onComplete }: AboutYouPageProps) {
  const saved = useMemo(loadProfile, []);

  const initialSex: Sex = isSex(saved.sex) ? saved.sex : "Female";
  const initialAvatars = getAvatarsForSex(initialSex);
  const initialAvatarId = initialAvatars.some((a) => a.id === saved.avatarId)
    ? (saved.avatarId as string)
    : initialAvatars[0].id;

  const [fullName, setFullName] = useState(toText(saved.fullName));
  const [age, setAge] = useState(toText(saved.age));
  const [sex, setSex] = useState<Sex>(initialSex);
  const [crewRole, setCrewRole] = useState(toText(saved.crewRole));
  const [height, setHeight] = useState(toText(saved.height));
  const [weight, setWeight] = useState(toText(saved.weight));
  const [avatarId, setAvatarId] = useState(initialAvatarId);
  const [avatarStyleId, setAvatarStyleId] = useState(
    AVATAR_STYLES.some((s) => s.id === saved.avatarStyle)
      ? (saved.avatarStyle as string)
      : AVATAR_STYLES[0].id
  );

  const availableAvatars = useMemo(() => getAvatarsForSex(sex), [sex]);
  const currentAvatar =
    availableAvatars.find((a) => a.id === avatarId) ?? availableAvatars[0];
  const currentStyle =
    AVATAR_STYLES.find((s) => s.id === avatarStyleId) ?? AVATAR_STYLES[0];

  /* Al cambiar el sexo, si el avatar actual ya no aplica, se elige el primero valido. */
  const handleSexChange = (next: Sex) => {
    setSex(next);
    const list = getAvatarsForSex(next);
    if (!list.some((a) => a.id === avatarId)) {
      setAvatarId(list[0].id);
    }
  };

  const ageN = Number(age);
  const heightN = Number(height);
  const weightN = Number(weight);

  const isComplete =
    fullName.trim() !== "" &&
    crewRole.trim() !== "" &&
    age !== "" &&
    height !== "" &&
    weight !== "" &&
    ageN > 0 &&
    heightN > 0 &&
    weightN > 0;

  const handleContinue = () => {
    if (!isComplete) return;
    const profile: StoredProfile = {
      fullName: fullName.trim(),
      age: ageN,
      sex,
      crewRole: crewRole.trim(),
      height: heightN,
      weight: weightN,
      avatarId: currentAvatar.id,
      avatarStyle: currentStyle.id,
    };
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
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

      <main className="about__body">
        <section className="about__intro">
          <h1>About You</h1>
          <p>A few basics so Maia can read your numbers the right way.</p>
        </section>

        <section className="card about__card">
          {/* Fila 1: avatar + nombre */}
          <div className="about__top">
            <div className="avatar-picker">
              <div
                className="avatar-picker__preview"
                style={{ backgroundColor: currentStyle.color }}
              >
                <img src={currentAvatar.src} alt={currentAvatar.label} />
              </div>

              <div className="avatar-picker__controls">
                <div
                  className="avatar-picker__gallery"
                  role="group"
                  aria-label="Choose avatar"
                >
                  {availableAvatars.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      title={a.label}
                      aria-label={a.label}
                      aria-pressed={a.id === currentAvatar.id}
                      className={
                        "avatar-picker__thumb" +
                        (a.id === currentAvatar.id
                          ? " avatar-picker__thumb--selected"
                          : "")
                      }
                      style={{ backgroundColor: currentStyle.color }}
                      onClick={() => setAvatarId(a.id)}
                    >
                      <img src={a.src} alt="" />
                    </button>
                  ))}
                </div>

                <div
                  className="avatar-picker__styles"
                  role="group"
                  aria-label="Avatar style"
                >
                  <span className="avatar-picker__caption">Avatar style</span>
                  <div className="avatar-picker__swatches">
                    {AVATAR_STYLES.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        title={s.label}
                        aria-label={s.label}
                        aria-pressed={s.id === currentStyle.id}
                        className={
                          "avatar-picker__swatch" +
                          (s.id === currentStyle.id
                            ? " avatar-picker__swatch--selected"
                            : "")
                        }
                        style={{ backgroundColor: s.color }}
                        onClick={() => setAvatarStyleId(s.id)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <Field label="Full name" htmlFor="fullName">
              <input
                id="fullName"
                className="field__input"
                type="text"
                placeholder="Ana Ruiz"
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </Field>
          </div>

          {/* Fila 2: Age / Sex / Crew role */}
          <div className="about__row about__row--3">
            <Field label="Age" htmlFor="age">
              <input
                id="age"
                className="field__input"
                type="number"
                inputMode="numeric"
                min={1}
                max={120}
                placeholder="38"
                value={age}
                onChange={(e) => setAge(e.target.value)}
              />
            </Field>

            <Field label="Sex" htmlFor="sex">
              <select
                id="sex"
                className="field__input field__select"
                value={sex}
                onChange={(e) => handleSexChange(e.target.value as Sex)}
              >
                {SEX_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Crew role" htmlFor="crewRole">
              <input
                id="crewRole"
                className="field__input"
                type="text"
                placeholder="Flight Engineer"
                value={crewRole}
                onChange={(e) => setCrewRole(e.target.value)}
              />
            </Field>
          </div>

          {/* Fila 3: Height / Weight */}
          <div className="about__row about__row--2">
            <Field label="Height (cm)" htmlFor="height">
              <input
                id="height"
                className="field__input"
                type="number"
                inputMode="decimal"
                min={1}
                step="0.1"
                placeholder="165"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
              />
            </Field>

            <Field label="Weight (kg)" htmlFor="weight">
              <input
                id="weight"
                className="field__input"
                type="number"
                inputMode="decimal"
                min={1}
                step="0.1"
                placeholder="61.2"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
            </Field>
          </div>

          <p className="about__note">
            We use this to adjust your ranges. You can change it later in Settings.
          </p>
        </section>
      </main>

      <footer className="about__footer">
        <button type="button" className="btn btn--secondary" onClick={onBack}>
          Back
        </button>
        <button
          type="button"
          className="btn"
          disabled={!isComplete}
          onClick={handleContinue}
        >
          Continue
        </button>
      </footer>
    </div>
  );
}