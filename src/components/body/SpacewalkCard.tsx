import { levelOf, spacewalk } from '../../data/maiaData';
import { EVENTS, TODAY_DAY } from '../../utils/mockData';
import { useVitals } from '../../utils/VitalsContext';
import Card from '../ui/Card';

/**
 * ISS view: short spacewalk summary; the full suit check is screen 1 of the spacewalk view.
 * Suit check = first sample (minute 0) of the synthetic EVA day of "tomas (sample)".
 * Limits = measurement_ranges.csv, location = spacewalk.
 */
const S = spacewalk.samples;
const L = spacewalk.limits;
const FIRST = S[0];
const CHECK = [
  { id: 'suit_pressure', label: 'Suit pressure', value: FIRST.suit_pressure.toFixed(2), raw: FIRST.suit_pressure, unit: 'psi' },
  { id: 'suit_co2', label: 'Suit CO₂', value: FIRST.suit_co2.toFixed(1), raw: FIRST.suit_co2, unit: 'mmHg' },
  { id: 'heart_rate', label: 'Heart rate', value: String(FIRST.heart_rate), raw: FIRST.heart_rate, unit: 'bpm' },
  { id: 'eva_time_remaining', label: 'Time available', value: String(FIRST.eva_time_remaining), raw: FIRST.eva_time_remaining, unit: 'min' },
].map((c) => ({ ...c, level: levelOf(L, c.id, c.raw) }));
const READY = CHECK.every((c) => c.level === 'green');


const peakAt = S.find((x) => x.event)?.minute;
const hm = (m: number) => `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`;


export default function SpacewalkCard() {
  const { setEvaMode } = useVitals();
  const inDays = EVENTS.eva != null ? EVENTS.eva - TODAY_DAY : null;
  return (
    <Card className="spacewalk-card" title="Spacewalk"
      aside={<span className="small muted">{inDays != null && inDays >= 0 ? `Planned D${EVENTS.eva} · in ${inDays} days` : 'Sample data'}</span>}>
      <div className="spacewalk-card__row">
        <span className={`spacewalk-card__pill spacewalk-card__pill--${READY ? 'green' : 'yellow'}`}>{READY ? 'Suit ready' : 'Check the suit'}</span>
        <span className="small">About {hm(spacewalk.duration_min)} outside{peakAt != null ? ` · hardest part around hour ${Math.floor(peakAt / 60)}` : ''} · sample data</span>
        <button type="button" className="btn spacewalk-card__start" onClick={() => setEvaMode(true)}>Open spacewalk</button>
      </div>
    </Card>
  );
}
