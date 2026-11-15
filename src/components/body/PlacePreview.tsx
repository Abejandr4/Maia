import { contexts, placeRules } from '../../data/maiaData';
import { CAREER_LIMIT_MSV } from '../../utils/mockData';
import Card from '../ui/Card';

/**
 * Lunar surface / Mars transit preview. There are no vital-sign series for these places,
 * so this view only shows what changes there, all from the workbook:
 * contexts.csv, alert_recipients.csv, combined_rules.csv, measurement_ranges.csv.
 */
const ROLE: Record<string, string> = {
  crew_medical_officer: 'Crew medical officer',
  crewmates: 'Crewmates',
  flight_surgeon: 'Flight surgeon (Earth)',
};
const LEVEL: Record<string, string> = { repeated_yellow: 'Repeated yellow', red: 'Red', emergency: 'Emergency', report: 'Report' };

function delayText(min: number | null, max: number | null) {
  const a = min ?? 0, b = max ?? 0;
  if (b >= 60) return `${Math.round(a / 60)}–${Math.round(b / 60)} min one way`;
  if (b <= 1) return '≤ 1 s';
  return a === b ? `${a} s one way` : `${a}–${b} s one way`;
}
const doseText = (a: number | null, b: number | null) => (a == null ? '—' : a === b || b == null ? `${a}` : `${a}–${b}`);
const daysToLimit = (dose: number | null) => (dose ? Math.round(CAREER_LIMIT_MSV / dose) : null);

export default function PlacePreview({ placeId }: { placeId: 'lunar_surface' | 'mars_transit' }) {
  const c = contexts.find((x) => x.id === placeId);
  const iss = contexts.find((x) => x.id === 'iss');
  if (!c) return null;
  const recipients = placeRules.alert_recipients
    .filter((r) => r.edition_or_location === placeId && r.level !== 'report')
    .sort((a, b) => a.order - b.order);
  const levels = [...new Set(recipients.map((r) => r.level))];
  // Only the rules that do not also apply on the ISS: what is stricter here.
  const rules = placeRules.combined_rules.filter((r) => {
    const locs = r.locations.split('|');
    return locs.includes(placeId) && !locs.includes('iss');
  });
  const issDays = [daysToLimit(iss?.daily_dose_msv_max ?? null), daysToLimit(iss?.daily_dose_msv_min ?? null)];
  const blackout = (c.blackout_days_max ?? 0) > 0;

  return (
    <div className="place-preview">
      <Card title={`${c.name} · preview`} aside={<span className="small muted">No vital-sign data for this place yet</span>}>
        <p style={{ margin: '0 0 6px' }}>{c.description.replace(/^Preview\.\s*/, '')}</p>
        <p className="small muted" style={{ margin: 0 }}>{c.comm_policy}</p>
      </Card>

      <div className="place-preview__tiles">
        <Card className="place-tile">
          <div className="analysis-label">Gravity</div>
          <div className="place-tile__value">{c.gravity}</div>
          <p className="small muted">ISS: {iss?.gravity}</p>
        </Card>
        <Card className={`place-tile ${(c.delay_one_way_max_s ?? 0) >= 60 ? 'place-tile--watch' : ''}`}>
          <div className="analysis-label">Signal delay</div>
          <div className="place-tile__value">{delayText(c.delay_one_way_min_s, c.delay_one_way_max_s)}</div>
          <p className="small muted">{blackout ? `No link for ${c.blackout_days_min}–${c.blackout_days_max} days at a time` : `ISS: ${delayText(iss?.delay_one_way_min_s ?? null, iss?.delay_one_way_max_s ?? null)}`}</p>
        </Card>
        <Card className="place-tile place-tile--watch">
          <div className="analysis-label">Radiation per day</div>
          <div className="place-tile__value">{doseText(c.daily_dose_msv_min, c.daily_dose_msv_max)} <small>mSv</small></div>
          <p className="small muted">
            {CAREER_LIMIT_MSV} mSv career limit in ~{daysToLimit(c.daily_dose_msv_max)} days (ISS: ~{issDays[0]}–{issDays[1]})
          </p>
        </Card>
      </div>

      <Card title="Who Maia tells, in order">
        <div className="place-preview__levels">
          {levels.map((lv) => (
            <div key={lv}>
              <div className="analysis-label">{LEVEL[lv] ?? lv}</div>
              <ol>
                {recipients.filter((r) => r.level === lv).map((r) => (
                  <li key={r.recipient_role + r.order}>
                    <strong>{ROLE[r.recipient_role] ?? r.recipient_role}</strong>
                    <span className="small muted"> · {r.channel}{r.notes ? ` · ${r.notes}` : ''}</span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
        <p className="small muted" style={{ margin: '8px 0 0' }}>On the ISS the flight surgeon is reached over the internet in near real time; here help from Earth is queued, so the crew medical officer acts first.</p>
      </Card>

      {rules.length > 0 && (
        <Card title="Stricter than on the ISS">
          <ul className="place-preview__rules">
            {rules.map((r) => (
              <li key={r.id}>
                <span className={`place-rule__pill place-rule__pill--${r.result_color}`}>{r.result_color}</span>
                <span><strong>{[r.condition_1, r.condition_2, r.condition_3].filter(Boolean).join(' + ')}</strong> → {r.message}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
