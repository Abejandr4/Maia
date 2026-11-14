import type { FrameMetrics, Guidance } from './types';

/**
 * Lightweight, dependency-free image-quality analysis.
 * It runs on a small, downscaled copy of the video frame (about 160x120),
 * so it's cheap enough to run several times a second on a tablet.
 *
 * Every threshold is a starting guess. Turn on `debug` in <GuidedCamera>
 * to see the live numbers, then tune these against your own camera and lighting.
 */
export const THRESHOLDS = {
  minBrightness: 70,     // mean luma below this → too dark
  maxGlare: 0.08,        // >8% blown-out pixels → glare
  maxMotion: 10,         // mean frame-to-frame difference → shaky
  minSkinCoverage: 0.25, // skin must fill at least 25% of the frame → else "move closer"
  minCenterSkin: 0.55,   // centre box must be mostly skin → else "centre it"
  tooCloseSkin: 0.92,    // nearly 100% skin and blurry → probably too close to focus
  minSharpness: 60,      // Laplacian variance (at 160px wide) below this → blurry
};

export const ANALYSIS_WIDTH = 160;
export const ANALYSIS_HEIGHT = 120;

/** YCbCr skin classifier. Uses only chroma, so it works across skin tones
 *  much better than RGB rules. It's a heuristic and can be fooled by beige
 *  walls or orange light, which is why it only steers the guidance. */
function isSkin(r: number, g: number, b: number): boolean {
  const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
  const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
  return cb >= 77 && cb <= 127 && cr >= 133 && cr <= 173;
}

export function analyzeFrame(
  img: ImageData,
  prevGray: Float32Array | null,
): { metrics: FrameMetrics; gray: Float32Array } {
  const { data, width: w, height: h } = img;
  const n = w * h;
  const gray = new Float32Array(n);

  // The centre box is the middle 50% of the frame and matches the on-screen reticle.
  const cx0 = Math.floor(w * 0.25), cx1 = Math.floor(w * 0.75);
  const cy0 = Math.floor(h * 0.25), cy1 = Math.floor(h * 0.75);

  let sumY = 0, glare = 0, dark = 0, skin = 0, centerSkin = 0, centerCount = 0, motion = 0;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const p = i * 4;
      const r = data[p], g = data[p + 1], b = data[p + 2];
      const Y = 0.299 * r + 0.587 * g + 0.114 * b;
      gray[i] = Y;
      sumY += Y;
      if (Y > 245) glare++;
      if (Y < 25) dark++;
      const s = isSkin(r, g, b);
      if (s) skin++;
      const inCenter = x >= cx0 && x < cx1 && y >= cy0 && y < cy1;
      if (inCenter) {
        centerCount++;
        if (s) centerSkin++;
      }
      if (prevGray) motion += Math.abs(Y - prevGray[i]);
    }
  }

  // Sharpness is the variance of a 4-neighbour Laplacian over the centre box.
  let lapSum = 0, lapSqSum = 0, lapN = 0;
  for (let y = Math.max(1, cy0); y < Math.min(h - 1, cy1); y++) {
    for (let x = Math.max(1, cx0); x < Math.min(w - 1, cx1); x++) {
      const i = y * w + x;
      const lap = gray[i - 1] + gray[i + 1] + gray[i - w] + gray[i + w] - 4 * gray[i];
      lapSum += lap;
      lapSqSum += lap * lap;
      lapN++;
    }
  }
  const lapMean = lapSum / lapN;
  const sharpness = lapSqSum / lapN - lapMean * lapMean;

  return {
    gray,
    metrics: {
      brightness: sumY / n,
      glare: glare / n,
      darkness: dark / n,
      sharpness,
      motion: prevGray ? motion / n : 0,
      skinCoverage: skin / n,
      centerSkin: centerCount ? centerSkin / centerCount : 0,
    },
  };
}

/** Turns metrics into one instruction. Order matters: fix lighting first,
 *  then steadiness, then distance/framing, then focus. */
export function getGuidance(m: FrameMetrics, t = THRESHOLDS): Guidance {
  if (m.brightness < t.minBrightness)
    return { level: 'bad', code: 'too_dark', message: 'Too dark. Add more light or turn on the flashlight.' };
  if (m.glare > t.maxGlare)
    return { level: 'adjust', code: 'glare', message: 'Too much glare. Tilt the camera slightly or move away from the direct light.' };
  if (m.motion > t.maxMotion)
    return { level: 'adjust', code: 'motion', message: 'Hold steady. Brace your arm against something.' };
  if (m.skinCoverage < t.minSkinCoverage)
    return { level: 'adjust', code: 'too_far', message: 'Move the camera closer to the area.' };
  if (m.centerSkin < t.minCenterSkin)
    return { level: 'adjust', code: 'off_center', message: 'Centre the mark inside the frame.' };
  if (m.sharpness < t.minSharpness) {
    if (m.skinCoverage > t.tooCloseSkin)
      return { level: 'adjust', code: 'too_close', message: 'Too close to focus. Move back a little.' };
    return { level: 'adjust', code: 'blurry', message: 'Image is blurry. Hold still, or tap the screen to refocus.' };
  }
  return { level: 'good', code: 'ok', message: 'Looks good. Hold still.' };
}

/** Exponential moving average so the instruction doesn't flicker frame to frame. */
export function smoothMetrics(prev: FrameMetrics | null, next: FrameMetrics, alpha = 0.35): FrameMetrics {
  if (!prev) return next;
  const out = { ...next };
  (Object.keys(next) as (keyof FrameMetrics)[]).forEach((k) => {
    out[k] = prev[k] + alpha * (next[k] - prev[k]);
  });
  return out;
}
