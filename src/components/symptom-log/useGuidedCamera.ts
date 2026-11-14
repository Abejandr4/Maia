import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import type { CapturedPhoto, FrameMetrics, Guidance } from './types';
import {
  ANALYSIS_HEIGHT,
  ANALYSIS_WIDTH,
  analyzeFrame,
  getGuidance,
  smoothMetrics,
} from './frameAnalysis';

const ANALYSIS_INTERVAL_MS = 200; // ~5 analyses per second
const AUTO_CAPTURE_HOLD_MS = 1500; // the frame must stay "good" this long before auto-capture
const SPEAK_COOLDOWN_MS = 3000;

type Facing = 'environment' | 'user';

interface Options {
  enabled: boolean;
  autoCapture: boolean;
  voice: boolean;
  onAutoCapture?: (photo: CapturedPhoto) => void;
}

const STARTING: Guidance = { level: 'adjust', code: 'starting', message: 'Starting camera…' };

export function useGuidedCamera(
  videoRef: RefObject<HTMLVideoElement | null>,
  { enabled, autoCapture, voice, onAutoCapture }: Options,
) {
  const [error, setError] = useState<string | null>(null);
  const [facing, setFacing] = useState<Facing>('environment');
  const [guidance, setGuidance] = useState<Guidance>(STARTING);
  const [metrics, setMetrics] = useState<FrameMetrics | null>(null);
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0); // 0–1 progress toward auto-capture

  const streamRef = useRef<MediaStream | null>(null);
  const prevGrayRef = useRef<Float32Array | null>(null);
  const smoothRef = useRef<FrameMetrics | null>(null);
  const goodSinceRef = useRef<number | null>(null);
  const lastSpokenRef = useRef<{ code: string; at: number }>({ code: '', at: 0 });
  const onAutoCaptureRef = useRef(onAutoCapture);
  onAutoCaptureRef.current = onAutoCapture;

  // Start and stop the camera stream.
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('Camera not available. The page must be served over HTTPS or from localhost.');
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facing },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play().catch(() => {});
        }
        const track = stream.getVideoTracks()[0];
        // `torch` isn't in the TS lib types yet. Chrome on Android supports it.
        const caps = (track.getCapabilities?.() ?? {}) as MediaTrackCapabilities & { torch?: boolean };
        setTorchSupported(!!caps.torch);
        setTorchOn(false);
        setError(null);
      } catch (e) {
        const err = e as DOMException;
        setError(
          err.name === 'NotAllowedError'
            ? 'Camera permission was denied. Allow camera access in your browser settings.'
            : err.message || 'Could not start the camera.',
        );
      }
    })();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      prevGrayRef.current = null;
      smoothRef.current = null;
      goodSinceRef.current = null;
      setGuidance(STARTING);
    };
  }, [enabled, facing, videoRef]);

  /** Grabs a full-resolution still from the video. */
  const capture = useCallback((): CapturedPhoto | null => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return null;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')!.drawImage(video, 0, 0);
    const m = smoothRef.current;
    return {
      id: crypto.randomUUID(),
      dataUrl: canvas.toDataURL('image/jpeg', 0.85),
      width: canvas.width,
      height: canvas.height,
      takenAt: new Date().toISOString(),
      metrics: m ?? {
        brightness: 0, glare: 0, darkness: 0, sharpness: 0, motion: 0, skinCoverage: 0, centerSkin: 0,
      },
      guidanceAtCapture: m ? getGuidance(m).code : 'starting',
    };
  }, [videoRef]);

  // Analysis loop.
  useEffect(() => {
    if (!enabled || error) return;
    const canvas = document.createElement('canvas');
    canvas.width = ANALYSIS_WIDTH;
    canvas.height = ANALYSIS_HEIGHT;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

    const id = window.setInterval(() => {
      const video = videoRef.current;
      if (!video || video.readyState < 2) return;

      ctx.drawImage(video, 0, 0, ANALYSIS_WIDTH, ANALYSIS_HEIGHT);
      const img = ctx.getImageData(0, 0, ANALYSIS_WIDTH, ANALYSIS_HEIGHT);
      const { metrics: raw, gray } = analyzeFrame(img, prevGrayRef.current);
      prevGrayRef.current = gray;

      const smoothed = smoothMetrics(smoothRef.current, raw);
      smoothRef.current = smoothed;
      const g = getGuidance(smoothed);
      setMetrics(smoothed);
      setGuidance((prev) => (prev.code === g.code ? prev : g));

      // Spoken guidance helps when both hands are busy.
      if (voice && 'speechSynthesis' in window) {
        const now = Date.now();
        const last = lastSpokenRef.current;
        if (g.code !== last.code && now - last.at > SPEAK_COOLDOWN_MS) {
          window.speechSynthesis.cancel();
          window.speechSynthesis.speak(new SpeechSynthesisUtterance(g.message));
          lastSpokenRef.current = { code: g.code, at: now };
        }
      }

      // Auto-capture after the frame has stayed good for long enough.
      if (g.code === 'ok') {
        goodSinceRef.current ??= Date.now();
        const held = Date.now() - goodSinceRef.current;
        setHoldProgress(autoCapture ? Math.min(1, held / AUTO_CAPTURE_HOLD_MS) : 0);
        if (autoCapture && held >= AUTO_CAPTURE_HOLD_MS) {
          goodSinceRef.current = null;
          setHoldProgress(0);
          const photo = capture();
          if (photo) onAutoCaptureRef.current?.(photo);
        }
      } else {
        goodSinceRef.current = null;
        setHoldProgress(0);
      }
    }, ANALYSIS_INTERVAL_MS);

    return () => window.clearInterval(id);
  }, [enabled, error, autoCapture, voice, capture, videoRef]);

  const toggleTorch = useCallback(async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    const next = !torchOn;
    try {
      await track.applyConstraints({ advanced: [{ torch: next } as MediaTrackConstraintSet] });
      setTorchOn(next);
    } catch {
      setTorchSupported(false);
    }
  }, [torchOn]);

  const switchCamera = useCallback(
    () => setFacing((f) => (f === 'environment' ? 'user' : 'environment')),
    [],
  );

  return {
    error, guidance, metrics, holdProgress,
    torchSupported, torchOn, toggleTorch,
    facing, switchCamera, capture,
  };
}
