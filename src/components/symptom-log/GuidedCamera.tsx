import { useRef, useState } from 'react';
import type { CapturedPhoto } from './types';
import { useGuidedCamera } from './useGuidedCamera';
import { createPortal } from 'react-dom';
import './symptomLog.css';

interface Props {
  onCapture: (photo: CapturedPhoto) => void;
  onClose: () => void;
  debug?: boolean; // shows live metrics so you can tune THRESHOLDS
}

export function GuidedCamera({ onCapture, onClose, debug = false }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [preview, setPreview] = useState<CapturedPhoto | null>(null);
  const [autoCapture, setAutoCapture] = useState(true);
  const [voice, setVoice] = useState(false);

  const cam = useGuidedCamera(videoRef, {
    enabled: !preview, // pause the camera while reviewing a shot
    autoCapture,
    voice,
    onAutoCapture: setPreview,
  });

  const takeManual = () => {
    const p = cam.capture();
    if (p) setPreview(p);
  };

  if (preview) {
    const overridden = preview.guidanceAtCapture !== 'ok';
    return createPortal(
      <div className="gc-root">
        <img className="gc-media" src={preview.dataUrl} alt="Captured photo preview" />
        {overridden && (
          <p className="gc-banner gc-banner--adjust">
            This photo was taken before the guidance said it was ready. It may be hard for your flight surgeon to read.
          </p>
        )}
        <div className="gc-controls">
          <button type="button" className="sl-btn sl-btn--ghost" onClick={() => setPreview(null)}>Retake</button>
          <button type="button" className="sl-btn" onClick={() => onCapture(preview)}>Use photo</button>
        </div>
      </div>,
      document.body,
    );
  }

  return createPortal(
    <div className="gc-root">
      {cam.error ? (
        <div className="gc-error">
          <p>{cam.error}</p>
          <button type="button" className="sl-btn" onClick={onClose}>Close</button>
        </div>
      ) : (
        <>
          <div className="gc-viewport">
            <video
              ref={videoRef}
              className="gc-media"
              playsInline
              muted
              style={{ transform: cam.facing === 'user' ? 'scaleX(-1)' : undefined }}
            />
            {/* Reticle: matches the centre box used by the analysis */}
            <div className={`gc-reticle gc-reticle--${cam.guidance.level}`}>
              {cam.holdProgress > 0 && (
                <div className="gc-hold" style={{ transform: `scaleX(${cam.holdProgress})` }} />
              )}
            </div>
            <p className={`gc-banner gc-banner--${cam.guidance.level}`} role="status" aria-live="polite">
              {cam.guidance.message}
            </p>
            {debug && cam.metrics && (
              <pre className="gc-debug">
                {Object.entries(cam.metrics)
                  .map(([k, v]) => `${k.padEnd(12)} ${v.toFixed(k === 'sharpness' || k === 'brightness' || k === 'motion' ? 1 : 3)}`)
                  .join('\n')}
              </pre>
            )}
          </div>

          <div className="gc-controls">
            <button type="button" className="sl-btn sl-btn--ghost" onClick={onClose}>Cancel</button>
            {cam.torchSupported && (
              <button type="button" className="sl-btn sl-btn--ghost" aria-pressed={cam.torchOn} onClick={cam.toggleTorch}>
                {cam.torchOn ? 'Light off' : 'Light on'}
              </button>
            )}
            <button type="button" className="sl-btn sl-btn--ghost" onClick={cam.switchCamera}>Flip</button>
            <button
              type="button"
              className="gc-shutter"
              aria-label="Take photo"
              onClick={takeManual}
              data-ready={cam.guidance.level === 'good'}
            />
          </div>

          <div className="gc-toggles">
            <label><input type="checkbox" checked={autoCapture} onChange={(e) => setAutoCapture(e.target.checked)} /> Auto-capture when ready</label>
            <label><input type="checkbox" checked={voice} onChange={(e) => setVoice(e.target.checked)} /> Spoken guidance</label>
          </div>
        </>
      )}
    </div>,
    document.body,
  );
}
