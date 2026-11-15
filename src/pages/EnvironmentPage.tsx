import type { Status } from '../utils/types';
import { useEnvironmentSummary, useIssPosition, worstSource, type DataSource } from '../utils/api';
import { ENVIRONMENT, EVENTS, MISSION_DAYS } from '../utils/mockData';
import { ageLabel } from '../utils/format';
import { useNow } from '../utils/hooks';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import StatusPill from '../components/ui/StatusPill';
import RadiationGauge from '../components/environment/RadiationGauge';
import DoseChart from '../components/environment/DoseChart';
import EnvMetricCard from '../components/environment/EnvMetricCard';
import IssCard from '../components/environment/IssCard';
import SpaceEventsList from '../components/environment/SpaceEventsList';
import './pages.css';

export default function EnvironmentPage() {
  const now = useNow(1000);
  const env = useEnvironmentSummary();
  const issFeed = useIssPosition();
  const summary = env.data;

  const last = MISSION_DAYS[MISSION_DAYS.length - 1];
  const careerDose = ENVIRONMENT.priorDose + last.cumulativeDose;
  const { co2, spaceWeather: mockWeather } = ENVIRONMENT;

  // Real space weather when the backend answers, mock otherwise
  const sw = summary?.spaceWeather;
  const weather = sw
    ? {
        value: sw.radiation.scale === 0 ? 'Quiet' : sw.radiation.label,
        status: sw.radiation.status,
        label: sw.radiation.text ?? sw.radiation.label,
        detail: `NOAA ${sw.radiation.label} · ${sw.geomagnetic.label} · ${sw.radioBlackout.label} · ${sw.s1ProbabilityNext3Days}% chance of S1+ in 3 days${
          summary.lastSep ? ` · last particle event ${summary.lastSep.time.slice(0, 10)}` : ''
        }`,
      }
    : { value: mockWeather.level, status: 'normal' as Status, label: mockWeather.level, detail: `${mockWeather.detail} · ${mockWeather.source}` };

  const source: DataSource | 'offline' = summary ? worstSource(Object.values(summary.sources)) : 'offline';
  const SOURCE_LABEL = { live: 'live', cache: 'cached', seed: 'snapshot', offline: 'demo data · backend offline' } as const;
  const updatedAt = env.updatedAt;
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
            <StatusPill status={summary?.overall.status ?? 'normal'} label={summary?.overall.label ?? 'All within limits'} />
            <span className={`source-chip source-chip--${source}`}>{SOURCE_LABEL[source]}</span>
            <span className="mono small muted">{updatedAt ? `updated ${ageLabel(now - updatedAt)}` : 'not connected'}</span>
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
            value={weather.value}
            status={weather.status}
            statusLabel={weather.label}
            detail={weather.detail}
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

        <div className="env-grid__orbit">
          <IssCard iss={issFeed.data?.iss ?? summary?.iss ?? null} source={issFeed.data?.source.source} />
          <SpaceEventsList events={summary?.events ?? []} kpSeries={sw?.kpSeries ?? []} kp={sw?.kp ?? null} />
        </div>

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
