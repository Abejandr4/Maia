/**
 * Your existing components plug in here — change these two lines and the
 * whole app picks them up.
 *
 *   export { default as Mascot } from '../Asteroid';
 *   export { default as SymptomLog } from '../SymptomLogForm';
 *
 * Props the app passes:
 *   <Mascot size={number} />
 *   <SymptomLog onClose={() => void} onSubmit={(entry) => void} />
 *     entry = { name, severity: 'mild'|'moderate'|'severe', note?, time: ISO string }
 *     onSubmit adds the entry to the Report page's symptom log.
 */
export { default as Mascot } from './Mascot3D';
export { default as SymptomLog } from './SymptomLogAdapter';
export type { Mascot3DProps as MascotProps } from './Mascot3D';
export type { SymptomLogProps } from './SymptomLogAdapter';