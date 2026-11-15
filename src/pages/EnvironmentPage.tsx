import type { Status } from '../utils/types';
import { useEnvironmentSummary, useIssPosition, worstSource, type DataSource } from '../utils/api';
import { ageLabel } from '../utils/format';
import { useNow } from '../utils/hooks';
import { REPORT_DAY, daily, reportSection, upTo } from '../data/maiaData';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import StatusPill from '../components/ui/StatusPill';
import RadiationGauge from '../components/environment/RadiationGauge';
import EnvMetricCard from '../components/environment/EnvMetricCard';
import IssCard from '../components/environment/IssCard';
import SpaceEventsList from '../components/environment/SpaceEventsList';
import MaiaLineChart from '../components/maia/MaiaLineChart';
import SourceTag from '../components/maia/SourceTag';
import '../components/maia/maia.css';
import './pages.css';

const CAREER_LIMIT_MSV = 600; // NASA-STD-3001 Vol. 1 [V1 4030]
const EVENT_LABEL: Record<string, string> = { solar_event: 'Solar S2', schedule_shift: 'Schedule shift', eva: 'EVA', co2_peak: 'CO₂ peak' };
const NAME: Record<string, string> = { heart_rate: 'Heart rate', temperature: 'Body temperature', 'immune (4 domains)': 'Immune review' };

export default function EnvironmentPage() {
  const now = useNow(1000);
  const env = useEnvironmentSummary();
  const issFeed = useIssPosition();
  const summary = env.data;

  /* ---- radiation (SAMPLE: guide §6, 0.4 mSv/day from 18 % prior career dose) ---- */
  const rad = upTo(daily.radiation_pct_of_career_limit);
  const radToday = rad[rad.length - 1];
  const radStart = daily.radiation_pct_of_career_limit[0];
  const careerMsv = ((radToday?.value ?? 0) / 100) * CAREER_LIMIT_MSV;
  const priorPct = radStart ? radStart.value - (0.4 / CAREER_LIMIT_MSV) * 100 : 0;
  const prev = rad[rad.length - 2];
  const todayDose = prev && radToday ? ((radToday.value - prev.value) / 100) * CAREER_LIMIT_MSV : 0;
  const missionDose = rad.map((r) => ({ day: r.day, value: ((r.value - priorPct) / 100) * CAREER_LIMIT_MSV }));

  /* ---- cabin CO₂ (SAMPLE daily values, limits from measurement_ranges.csv) ---- */
  const co2 = upTo(daily.cabin_co2);
  const co2Today = co2[co2.length - 1];
  const co2Ref = daily.reference.cabin_co2;
  const limit7d = co2Ref?.green_max ?? 2.5;
  const limit1h = co2Ref?.red_above ?? 3;
  const congestion = daily.co2_rules.find((r) => r.id === 'co2_congestion');
  const watch7d = congestion ? Number(congestion.condition_1.match(/([\d.]+)\s*mmHg/)?.[1] ?? NaN) : NaN;
  const co2Status: Status =
    (co2Today?.max_1h ?? 0) > limit1h ? 'warning' : (co2Today?.mean_7d ?? 0) >= limit7d ? 'caution' : 'normal';

  /* ---- events and the body changes they may explain ---- */
  const events = upTo(daily.events.filter((e) => e.kind === 'event'));
  const overlap = reportSection<{ change: string; event: string; day: number }[]>('Overlapping events') ?? [];
  const changes = reportSection<{ changes: { measurement: string; detected_day: number }[] }>('Ordered changes')?.changes ?? [];
  const replay = daily.solar_event_replay[0];

  /* ---- live space weather (backend), or the documented replay when offline ---- */
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
    : {
        value: 'Offline',
        status: 'advisory' as Status,
        label: 'No live feed',
        detail: replay
          ? `Backend offline. Demo replays the ${replay.date.slice(0, 10)} storm (${replay.noaa_s_scale}, ${replay.proton_flux_pfu} pfu) on mission day 30.`
          : 'Backend offline.',
      };

  const source: DataSource | 'offline' = summary ? worstSource(Object.values(summary.sources)) : 'offline';
  const SOURCE_LABEL = { live: 'live', cache: 'cached', seed: 'snapshot', offline: 'demo data · backend offline' } as const;
  const updatedAt = env.updatedAt;

  return (
    <div className="page page--env">
      <PageHeader
        eyebrow="Environment · cabin and orbit"
        title="Environment"
        subtitle="Radiation, air and space weather — the conditions behind your signals."
        aside={
          <>
            <StatusPill status={summary?.overall.status ?? 'normal'} label={summary?.overall.label ?? 'Cabin within limits'} />
            <span className={`source-chip source-chip--${source}`}>{SOURCE_LABEL[source]}</span>
            <span className="mono small muted">{updatedAt ? `updated ${ageLabel(now - updatedAt)}` : 'not connected'}</span>
          </>
        }
      />

      <div className="env-grid">
        <Card
          className="env-grid__gauge"
          title="Career radiation dose"
          aside={<span className="mono">LIMIT {CAREER_LIMIT_MSV} mSv</span>}
        >
          <RadiationGauge value={careerMsv} limit={CAREER_LIMIT_MSV} />
          <p className="env-note">
            Day {REPORT_DAY}: {radToday?.value.toFixed(1)} % of the NASA-STD-3001 career limit ({priorPct.toFixed(0)} % before this mission +{' '}
            {missionDose[missionDose.length - 1]?.value.toFixed(1)} mSv on board).
          </p>
          <div className="maia-tags" style={{ marginTop: 8 }}>
            <SourceTag kind="sample" />
            <SourceTag kind="cited" ids="S04; S06; S93" label="LIMIT · RATE" />
          </div>
        </Card>

        <div className="env-grid__stack">
          <EnvMetricCard
            title="Today’s dose"
            value={todayDose.toFixed(1)}
            unit="mSv"
            status="normal"
            detail="Sample value (guide §6). On the ISS the daily dose is about 0.44–0.88 mSv depending on the solar cycle (Cucinotta 2008)."
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
            value={(co2Today?.mean ?? 0).toFixed(2)}
            unit="mmHg"
            status={co2Status}
            statusLabel={co2Status === 'normal' ? 'Within limits' : co2Status === 'caution' ? '7-day mean high' : '1-h limit passed'}
            detail={`7-day mean ${co2Today?.mean_7d != null ? co2Today.mean_7d.toFixed(2) : '–'} mmHg · limits: 7-day mean ≤ ${limit7d}, 1-h ≤ ${limit1h} mmHg (NASA OCHMO CO₂ brief)`}
          />
        </div>

        <Card
          className="env-grid__chart"
          title={<span className="env-chart-title">Cabin CO₂ over the mission</span>}
          aside={
            <div className="maia-tags">
              <SourceTag kind="sample" />
              <SourceTag kind="cited" ids="S05; S63; S64" label="LIMITS" />
            </div>
          }
        >
          <MaiaLineChart
            points={co2.map((c) => ({ day: c.day, value: c.mean }))}
            points2={co2.map((c) => ({ day: c.day, value: c.mean_7d }))}
            label2="7-day mean"
            refLines={[
              { value: limit1h, label: `1-h ${limit1h}`, tone: 'red' },
              { value: limit7d, label: `7-day ${limit7d}`, tone: 'green' },
              ...(isFinite(watch7d) ? [{ value: watch7d, label: `headache watch ${watch7d}`, tone: 'watch' as const }] : []),
            ]}
            events={events.map((e) => ({ day: e.day, label: EVENT_LABEL[e.id] ?? e.id }))}
            unit="mmHg"
            digits={2}
            fromDay={1}
            toDay={REPORT_DAY}
          />
          <div className="maia-legend">
            <span>
              <i style={{ background: 'var(--series-a)' }} />
              daily value
            </span>
            <span>
              <i style={{ background: 'var(--series-b)' }} />
              7-day mean
            </span>
            <span>{congestion?.message}</span>
          </div>
        </Card>

        <Card
          className="env-grid__chart"
          title={<span className="env-chart-title">Radiation dose this mission</span>}
          aside={<SourceTag kind="sample" label="SAMPLE · 0.4 mSv/day" />}
        >
          <MaiaLineChart
            points={missionDose}
            events={events.filter((e) => e.id === 'solar_event').map((e) => ({ day: e.day, label: 'Solar particle event (replay)' }))}
            unit="mSv"
            digits={1}
            step
            fromDay={1}
            toDay={REPORT_DAY}
            height={220}
          />
          <p className="maia-note">
            The extra dose of the solar event is not in any cited source, so it is not added — the event is marked, not invented.
          </p>
        </Card>

        <Card className="env-grid__chart" title={<span className="env-chart-title">Events that may explain a change</span>} aside={<span className="muted small">±1 day rule · never changes your band</span>}>
          <ul className="maia-events">
            {events.map((e) => {
              const linked = changes.filter((c) => overlap.some((o) => o.event === e.id && o.change === c.measurement));
              return (
                <li key={e.day + e.id}>
                  <span className="maia-events__day">D{e.day}</span>
                  <div>
                    <p className="maia-events__title">{e.description}</p>
                    <p className="maia-events__sub">
                      {linked.length
                        ? `Shown beside: ${linked.map((c) => `${NAME[c.measurement] ?? c.measurement} (detected D${c.detected_day})`).join(', ')}`
                        : 'No marked change around this day.'}
                    </p>
                    <div className="maia-tags" style={{ marginTop: 6 }}>
                      {e.id === 'solar_event' ? (
                        <>
                          <SourceTag kind="cited" ids="S53; S54" label={`REPLAY · ${replay?.date.slice(0, 10) ?? ''}`} />
                          <SourceTag kind="unverified" label="DONKI ID PENDING" />
                        </>
                      ) : (
                        <SourceTag kind="sample" />
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>

        <div className="env-grid__orbit">
          <IssCard iss={issFeed.data?.iss ?? summary?.iss ?? null} source={issFeed.data?.source.source} />
          <SpaceEventsList events={summary?.events ?? []} kpSeries={sw?.kpSeries ?? []} kp={sw?.kp ?? null} />
        </div>
      </div>
    </div>
  );
}
