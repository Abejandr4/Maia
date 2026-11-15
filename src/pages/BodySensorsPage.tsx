import { useMemo, useState } from 'react';
import type { Range, VitalEvaluation, VitalKey } from '../utils/types';
import { GENERAL_REF, PERSONAL_NORMAL } from '../utils/baselines';
import { BODY_ZONES } from '../utils/mockData';
import { useVitals } from '../utils/VitalsContext';
import PageHeader from '../components/ui/PageHeader';
import SegmentedTabs from '../components/ui/SegmentedTabs';
import Card from '../components/ui/Card';
import BodyMap from '../components/body/BodyMap';
import ZoneDetail from '../components/body/ZoneDetail';
import VitalCard from '../components/body/VitalCard';
import SensorConsole from '../components/body/SensorConsole';
import DeviationTable from '../components/body/DeviationTable';
import SymptomZones from '../components/body/SymptomZones';
import MeasureGuide from '../components/body/MeasureGuide';
import './pages.css';

type BodyTab = 'live' | 'analysis' | 'symptoms' | 'measure';

const VITALS: VitalKey[] = ['bp', 'hr', 'spo2', 'temp'];

const RANGES: Record<VitalKey, { personal: Range; general: Range; digits: number }> = {
  bp: { personal: PERSONAL_NORMAL.systolic, general: GENERAL_REF.systolic, digits: 0 },
  hr: { personal: PERSONAL_NORMAL.hr, general: GENERAL_REF.hr, digits: 0 },
  spo2: { personal: PERSONAL_NORMAL.spo2, general: GENERAL_REF.spo2, digits: 0 },
  temp: { personal: PERSONAL_NORMAL.temp, general: GENERAL_REF.temp, digits: 1 },
};

export default function BodySensorsPage({ onLogSymptom }: { onLogSymptom: () => void }) {
  const { history, evaluations } = useVitals();
  const [tab, setTab] = useState<BodyTab>('live');
  const [zoneId, setZoneId] = useState<number | null>(4);

  const current = history[history.length - 1];
  const series = useMemo<Record<VitalKey, number[]>>(
    () => ({
      bp: history.map((s) => s.systolic),
      hr: history.map((s) => s.hr),
      spo2: history.map((s) => s.spo2),
      temp: history.map((s) => s.temp),
    }),
    [history],
  );
  const byKey = Object.fromEntries(evaluations.map((e) => [e.key, e])) as Record<VitalKey, VitalEvaluation>;

  return (
    <div className="page page--body">
      <PageHeader
        eyebrow="Personal normal · learned on days 1–14"
        title="Body & Sensors"
        subtitle="Ten zones, four live signals. Every reading shows its age."
        aside={
          <SegmentedTabs<BodyTab>
            ariaLabel="Body view"
            value={tab}
            onChange={setTab}
            options={[
              { value: 'live', label: 'Live' },
              { value: 'analysis', label: 'Analysis' },
              { value: 'symptoms', label: 'Symptoms' },
              { value: 'measure', label: 'Measure' },
            ]}
          />
        }
      />

      {tab === 'live' && (
        <div className="body-grid">
          <Card className="body-grid__map" title="Body map · 10 zones" aside={<span>tap a zone</span>}>
            <BodyMap zones={BODY_ZONES} selected={zoneId} onSelect={(id) => setZoneId(zoneId === id ? null : id)} />
            <ZoneDetail zone={BODY_ZONES.find((z) => z.id === zoneId)} />
          </Card>

          {VITALS.map((k) => (
            <VitalCard
              key={k}
              evaluation={byKey[k]}
              values={series[k]}
              personal={RANGES[k].personal}
              general={RANGES[k].general}
              digits={RANGES[k].digits}
              sampleAt={current.t}
            />
          ))}

          <div className="body-grid__console">
            <SensorConsole />
          </div>
        </div>
      )}

      {tab === 'analysis' && <DeviationTable />}
      {tab === 'symptoms' && <SymptomZones onLogSymptom={onLogSymptom} />}
      {tab === 'measure' && <MeasureGuide />}
    </div>
  );
}
