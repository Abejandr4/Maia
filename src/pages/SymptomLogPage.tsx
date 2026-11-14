import { SymptomLogger } from '../components/symptom-log/SymptomLogger';
import type { SensorReading } from '../components/symptom-log/types';

// Placeholder until your real sensor data is wired in
const mockReadings = (): SensorReading[] => [
  { kind: 'heart_rate', label: 'Heart rate', value: 72, unit: 'bpm', timestamp: new Date().toISOString(), status: 'normal' },
  { kind: 'blood_pressure', label: 'Blood pressure', value: '128/84', unit: 'mmHg', timestamp: new Date().toISOString(), status: 'caution' },
  { kind: 'body_temperature', label: 'Body temperature', value: 36.8, unit: '°C', timestamp: new Date().toISOString(), status: 'normal' },
];

export default function SymptomLogPage() {
  return (
    <SymptomLogger
      crew={{ id: 'CM-01', name: 'Test Astronaut', mission: 'Space Apps 2026' }}
      getSensorSnapshot={mockReadings}
    />
  );
}