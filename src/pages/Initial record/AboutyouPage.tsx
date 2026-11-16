import { useEffect, useMemo, useState } from "react";
import "../pages.css";

/* -------------------------------------------------------------------------- */
/* Tipos                                                                      */
/* -------------------------------------------------------------------------- */

type Sex = "Female" | "Male";
type SexCategory = "female" | "male";

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


const AVATAR_OPTIONS: AvatarOption[] = [
  { id: "female-1", label: "Female avatar", sexCategory: "female", src: import.meta.env.BASE_URL + "avatars/avatar-mujer.png" },
  { id: "male-1", label: "Male avatar", sexCategory: "male", src: import.meta.env.BASE_URL + "avatars/avatar-hombre.png" },
];

const AVATAR_STYLES: AvatarStyle[] = [
  { id: "light", label: "Light", color: "#f9cca9" },
  { id: "medium", label: "Medium", color: "#e19760" },
  { id: "dark", label: "Dark", color: "#935638" },
  { id: "deep", label: "Deep", color: "#64392b" },
];

export function AvatarPortrait({ avatarId, tone, headOnly = false }: {
  avatarId: string;
  tone?: string;
  headOnly?: boolean;
}) {
  const avatar = AVATAR_OPTIONS.find((entry) => entry.id === avatarId) ?? AVATAR_OPTIONS[0];
  const target = AVATAR_STYLES.find((entry) => entry.id === tone)?.color;
  const [tinted, setTinted] = useState<{ source: string; tone: string; url: string }>();
  useEffect(() => {
    if (!target || target === "#e19760") return;
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 768;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) return;
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const frame = context.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = frame.data;
      const reference = [225, 151, 96];
      const clamp = (value: number) => Math.max(0, Math.min(1, value));
      const tone = [0, 1, 2].map((channel) => Number.parseInt(target.slice(1 + channel * 2, 3 + channel * 2), 16));
      const luma = (r: number, g: number, b: number) => 0.299 * r + 0.587 * g + 0.114 * b;
      const refLuma = luma(reference[0], reference[1], reference[2]);
      const total = canvas.width * canvas.height;
      const skin = new Float32Array(total);
      const light = new Float32Array(total);
      for (let k = 0; k < total; k++) {
        const i = k * 4;
        const [r, g, b] = [pixels[i], pixels[i + 1], pixels[i + 2]];
        light[k] = luma(r, g, b) / refLuma;
        if (!pixels[i + 3] || k / total > .96 || g <= b || r <= g) continue;
        const hue = (g - b) / (r - b);
        skin[k] = clamp((hue - .32) / .12) * clamp((.83 - hue) / .12) *
          clamp((g - 62) / 31) * clamp((r - b - 12) / 21);
      }
      const smoothTone = luma(tone[0], tone[1], tone[2]) < refLuma;
      if (!smoothTone) {
        // lighter tones: gentle per-channel shift (keeps the original look)
        const ratio = reference.map((value, channel) => tone[channel] / value);
        for (let k = 0; k < total; k++) {
          if (!skin[k]) continue;
          for (let channel = 0; channel < 3; channel++) pixels[k * 4 + channel] *= 1 + (ratio[channel] - 1) * skin[k];
        }
      } else {
        // darker tones: soft mask + smoothed shading, so skin looks even and rich instead of grainy
        const w = canvas.width, h = canvas.height;
        const blur = (src: Float32Array, radius: number) => {
          const tmp = new Float32Array(total), out = new Float32Array(total), size = radius * 2 + 1;
          for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
            let sum = 0;
            for (let d = -radius; d <= radius; d++) sum += src[y * w + Math.min(w - 1, Math.max(0, x + d))];
            tmp[y * w + x] = sum / size;
          }
          for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
            let sum = 0;
            for (let d = -radius; d <= radius; d++) sum += tmp[Math.min(h - 1, Math.max(0, y + d)) * w + x];
            out[y * w + x] = sum / size;
          }
          return out;
        };
        const mask = blur(skin.map((value) => Math.min(1, value * 2.5)), 3);
        // blush, nose tip and ears stay orange on dark skin: find them (warm, near the skin) and tone them too
        const near = blur(skin.map((value) => (value > .05 ? 1 : 0)), 16);
        const blush = new Float32Array(total);
        for (let k = 0; k < total; k++) {
          const i = k * 4;
          const [r, g, b] = [pixels[i], pixels[i + 1], pixels[i + 2]];
          if (!pixels[i + 3] || near[k] <= .01 || r <= 155 || !(r > g && g > b)) continue;
          const hue = (g - b) / Math.max(r - b, 1);
          if (hue > .15 && hue < .8 && light[k] > .35 && (r - b) / Math.max(r, 1) > .35) blush[k] = 1;
        }
        const blushSoft = blur(blush, 1);
        const weight = new Float32Array(total);
        for (let k = 0; k < total; k++) {
          weight[k] = pixels[k * 4 + 3] ? Math.max(Math.min(1, mask[k] * 1.4), blushSoft[k]) : 0;
        }
        // shading: keep the 3D light of the original and stretch it, so dark skin keeps shadows and highlights
        const shading = blur(light.map((value, k) => (blushSoft[k] > .3 && mask[k] * 1.4 < .5 ? Math.min(value, 1.05) : value)), 1);
        const meanWeight = blur(weight, 10);
        const meanShading = blur(shading.map((value, k) => value * weight[k]), 10);
        const toneLuma = luma(tone[0], tone[1], tone[2]);
        const base = tone.map((value) => Math.max(0, Math.min(255, toneLuma + (value - toneLuma) * 1.2)));
        const shadow = [base[0] * .40, base[1] * .28, base[2] * .26];
        const highlight = [255, 205, 160].map((value, channel) => base[channel] + (value - base[channel]) * .45);
        for (let k = 0; k < total; k++) {
          const w = weight[k];
          if (!w) continue;
          const i = k * 4;
          const mean = meanShading[k] / Math.max(meanWeight[k], 1e-3);
          const level = Math.max(.15, Math.min(1.7, mean + (shading[k] - mean) * 2.6));
          const toBase = Math.min(1, level);
          const toHigh = Math.max(0, Math.min(1, (level - 1) / .6));
          for (let channel = 0; channel < 3; channel++) {
            let value = shadow[channel] + (base[channel] * 1.08 - shadow[channel]) * toBase;
            value += (highlight[channel] - value) * toHigh;
            value = Math.max(0, Math.min(255, value));
            pixels[i + channel] = pixels[i + channel] * (1 - w) + value * w;
          }
        }
      }
      context.putImageData(frame, 0, 0);
      setTinted({ source: avatar.src, tone: target, url: canvas.toDataURL() });
    };
    image.src = avatar.src;
    return () => { image.onload = null; };
  }, [avatar.src, target]);
  const matchesTone = tinted && tinted.source === avatar.src && tinted.tone === target;
  return (
    <img
      src={matchesTone ? tinted.url : avatar.src}
      alt={avatar.label}
      width={512}
      height={768}
      style={headOnly
        ? { display: "block", width: "190%", height: "auto", maxWidth: "none", marginLeft: "-39%" }
        : { display: "block", width: "100%", height: "auto" }}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Constantes y utilidades                                                    */
/* -------------------------------------------------------------------------- */

const PROFILE_KEY = "userProfile";
const TOTAL_STEPS = 8;
const CURRENT_STEP = 2;
const SEX_OPTIONS: Sex[] = ["Female", "Male"];

function isSex(value: unknown): value is Sex {
  return value === "Female" || value === "Male";
}

/** Devuelve los avatares validos para el sexo indicado. */
function getAvatarsForSex(sex: Sex): AvatarOption[] {
  const category: SexCategory = sex === "Female" ? "female" : "male";
  return AVATAR_OPTIONS.filter((a) => a.sexCategory === category);
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
      : "medium"
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
    <div className="page about--roomy">
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
                style={{ backgroundColor: "var(--surface, #faf9f6)" }}
              >
                <AvatarPortrait avatarId={currentAvatar.id} tone={currentStyle.id} headOnly />
              </div>

              <div className="avatar-picker__controls">
                <div
                  className="avatar-picker__styles"
                  role="group"
                  aria-label="Skin tone"
                >
                  <span className="avatar-picker__caption">Skin tone</span>
                  <div className="avatar-picker__swatches" style={{ display: "flex", gap: 6, marginBlock: 5 }}>
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
                        style={{ backgroundColor: s.color, width: 26, height: 26, padding: 0, borderRadius: "50%", border: s.id === currentStyle.id ? "2px solid currentColor" : "1px solid #777" }}
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