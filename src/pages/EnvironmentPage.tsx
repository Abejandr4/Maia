import { useState } from 'react';
import type { Status } from '../utils/types';
import { ENVIRONMENT, EVENTS, MISSION_DAYS } from '../utils/mockData';
import { ageLabel } from '../utils/format';
import { useNow } from '../utils/hooks';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import StatusPill from '../components/ui/StatusPill';
import RadiationGauge from '../components/environment/RadiationGauge';
import DoseChart from '../components/environment/DoseChart';
import EnvMetricCard from '../components/environment/EnvMetricCard';
import './pages.css';

export default function EnvironmentPage() {
  const now = useNow(1000);
  const [updatedAt] = useState(() => Date.now() - 12_000);

  const last = MISSION_DAYS[MISSION_DAYS.length - 1];
  const careerDose = ENVIRONMENT.priorDose + last.cumulativeDose;
  const { co2, spaceWeather } = ENVIRONMENT;
  const co2Status: Status = co2.value > co2.target ? 'advisory' : 'normal';
  const todayStatus: Status = ENVIRONMENT.todayDose > ENVIRONMENT.dailyPlanning ? 'warning' : 'normal';

  return (
    <div className="page page--env">
      <PageHeader
        eyebrow="Environment · cabin and orbit"
        title="Environment"
        subtitle="Radiation, air and space weather — the conditions behind your signals."
        aside={
          <>
            <StatusPill status="normal" label="All within limits" />
            <span className="mono small muted">updated {ageLabel(now - updatedAt)}</span>
          </>
        }
      />

      <div className="env-grid">
        <Card className="env-grid__gauge" title="Career radiation dose" aside={<span className="mono">LIMIT {ENVIRONMENT.careerLimit} mSv</span>}>
          <RadiationGauge value={careerDose} limit={ENVIRONMENT.careerLimit} />
          <p className="env-note">
            Green = inside the NASA-STD-3001 career limit. Shielded sleep quarters cut daily dose by about 30 %.
          </p>
        </Card>

        <div className="env-grid__stack">
          <EnvMetricCard
            title="Today’s dose"
            value={ENVIRONMENT.todayDose.toFixed(1)}
            unit="mSv"
            status={todayStatus}
            detail={`so far today · ${ENVIRONMENT.todayHoursInLab} h in the lab module · ${ENVIRONMENT.dailyPlanning} mSv daily planning value`}
          />
          <EnvMetricCard
            title="Space weather"
            value={spaceWeather.level}
            status="normal"
            statusLabel={spaceWeather.level}
            detail={`${spaceWeather.detail} · ${spaceWeather.source}`}
          />
          <EnvMetricCard
            title="Cabin CO₂"
            value={co2.value.toFixed(1)}
            unit="mmHg"
            status={co2Status}
            statusLabel={co2Status === 'normal' ? 'Normal' : 'Watch'}
            detail={`Above the ${co2.target.toFixed(1)} target since D${co2.since} · shown next to your headaches in the report`}
          />
        </div>

        <Card
          className="env-grid__chart"
          title={<span className="env-chart-title">Accumulated dose over the mission</span>}
          aside={
            <span className="dose-legend">
              <span>
                <i className="legend-dot" style={{ background: 'var(--normal)' }} />
                dose
              </span>
              <span>
                <i className="dose-legend__dash" />
                event step
              </span>
            </span>
          }
        >
          <DoseChart days={MISSION_DAYS} solarDay={EVENTS.solar} evaDay={EVENTS.eva} />
        </Card>

        <div className="env-grid__cabin">
          {ENVIRONMENT.cabin.map((c) => (
            <EnvMetricCard
              key={c.label}
              compact
              title={c.label}
              value={c.value}
              unit={c.unit}
              status={c.status}
              statusLabel={c.status === 'normal' ? 'OK' : 'Watch'}
              detail={c.ref}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
