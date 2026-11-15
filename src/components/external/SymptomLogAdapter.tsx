import { SymptomLogger } from '../symptom-log/SymptomLogger';
import type { SensorReading, SymptomReport } from '../symptom-log/types';
import type { Severity as AppSeverity, SymptomEntry as AppSymptom, Status } from '../../utils/types';
import { evaluateSample, roundSample } from '../../utils/baselines';
import { ASTRONAUT } from '../../utils/mockData';
import { useVitals } from '../../utils/VitalsContext';

export interface SymptomLogProps {
  onClose: () => void;
  onSubmit?: (entry: Omit<AppSymptom, 'id'>) => void;
}

// Your logger rates 0–10; the rest of the app uses mild / moderate / severe
const toAppSeverity = (n: number): AppSeverity => (n >= 7 ? 'severe' : n >= 4 ? 'moderate' : 'mild');

// Adjust if your SensorReading['status'] uses different words
const toReadingStatus = (s: Status) =>
  (s === 'normal' ? 'normal' : s === 'advisory' || s === 'caution' ? 'caution' : 'warning') as SensorReading['status'];

export default function SymptomLogAdapter({ onClose, onSubmit }: SymptomLogProps) {
  const { current } = useVitals();

  // Snapshot of the live feed at the moment the report is prepared
  const getSensorSnapshot = (): SensorReading[] => {
    const s = roundSample(current);
    const ev = Object.fromEntries(evaluateSample(current).map((e) => [e.key, e.status]));
    const ts = new Date(s.t).toISOString();
    return [
      { kind: 'heart_rate', label: 'Heart rate', value: s.hr, unit: 'bpm', timestamp: ts, status: toReadingStatus(ev.hr) },
      { kind: 'blood_pressure', label: 'Blood pressure', value: `${s.systolic}/${s.diastolic}`, unit: 'mmHg', timestamp: ts, status: toReadingStatus(ev.bp) },
      { kind: 'body_temperature', label: 'Body temperature', value: s.temp, unit: '°C', timestamp: ts, status: toReadingStatus(ev.temp) },
      // Add SpO₂ here if your SensorReading['kind'] has a value for it, e.g. 'spo2'
    ];
  };

  // Called by "Send to flight surgeon": copy each symptom into the app's log, then close
  const handleSubmit = async (report: SymptomReport) => {
    // Photos belong to the whole report: attach them to the first symptom so the Report page can show them
    const photos = report.photos.map((p) => ({
      dataUrl: p.dataUrl,
      takenAt: p.takenAt,
      bodyLocation: p.bodyLocation,
      caption: p.caption,
    }));
    report.symptoms.forEach((s, i) =>
      onSubmit?.({
        name: s.name === 'Other' && s.customName ? s.customName : s.name,
        severity: toAppSeverity(s.severity),
        note: [s.bodyLocation, s.notes].filter(Boolean).join(' · ') || undefined,
        time: s.onset,
        photos: i === 0 && photos.length ? photos : undefined,
      }),
    );
    // TODO: also send `report` to your backend / ground link here
    onClose();
  };

  return (
    <SymptomLogger
      crew={{ id: 'CM-01', name: ASTRONAUT.name, mission: 'Space Apps 2026' }}
      getSensorSnapshot={getSensorSnapshot}
      onSubmit={handleSubmit}
    />
  );
}