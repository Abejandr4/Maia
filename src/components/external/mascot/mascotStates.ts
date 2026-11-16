/**
 * Mascot moods.
 * They are driven by daily habits only (water, sleep, completed measurements),
 * never by medical values. Medical status lives in the clinical UI layer.
 */
export type MascotState = 'idle' | 'happy' | 'thirsty' | 'tired' | 'celebrating';

/** Numeric parameters that fully describe how the mascot looks and moves. */
export interface MascotPose {
  /** Hop height */
  bob: number;
  /** Hop speed */
  speed: number;
  /** Roll angle in radians */
  tilt: number;
  /** Eye openness, 0 (closed) to 1 (open) */
  eye: number;
  /** Mouth curve: positive smiles, negative frowns */
  smile: number;
  /** How open the mouth is, 0 to 1 */
  open: number;
  /** Cheek blush opacity, 0 to 1 */
  cheek: number;
  /** Sparkle intensity, 0 to 1 */
  spark: number;
  /** Water drop visibility, 0 to 1 */
  drop: number;
  /** Overall scale */
  scale: number;
}

/** To add a state: add its name to MascotState, then add a pose here. */
export const MASCOT_POSES: Record<MascotState, MascotPose> = {
  idle:        { bob: 0, speed: 1.3, tilt: 0,    eye: 1,   smile: 0.7,   open: 0,   cheek: 0.4,  spark: 0,   drop: 0, scale: 1 },
  happy:       { bob: 0.28, speed: 3.2, tilt: 0.1,  eye: 1,   smile: 1,     open: 0.5, cheek: 0.85, spark: 0.6, drop: 0, scale: 1.03 },
  thirsty:     { bob: 0.05, speed: 1.6, tilt: -0.1, eye: 0.8, smile: -0.3,  open: 0,   cheek: 0.2,  spark: 0,   drop: 1, scale: 0.94 },
  tired:       { bob: 0.03, speed: 0.7, tilt: 0.3,  eye: 0.3, smile: -0.12, open: 0,   cheek: 0.3,  spark: 0,   drop: 0, scale: 0.96 },
  celebrating: { bob: 0.6,  speed: 4.6, tilt: 0,    eye: 1,   smile: 1.2,   open: 1,   cheek: 1,    spark: 1,   drop: 0, scale: 1.06 },
};

/** Keys of a pose, used to blend smoothly from one state to another. */
export const POSE_KEYS = Object.keys(MASCOT_POSES.idle) as (keyof MascotPose)[];
