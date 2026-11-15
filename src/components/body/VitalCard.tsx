import type { Range, VitalEvaluation } from '../../utils/types';
import { rangeText } from '../../utils/baselines';
import { ageLabel } from '../../utils/format';
import { useNow } from '../../utils/hooks';
import Card from '../ui/Card';
import Sparkline from '../ui/Sparkline';
import StatusPill from '../ui/StatusPill';
import './body.css';

interface VitalCardProps {
  evaluation: VitalEvaluation;
  values: number[];
  personal: Range;
  general: Range;
  digits?: number;
  sampleAt: number;
}

export default function VitalCard({ evaluation, values, personal, general, digits = 0, sampleAt }: VitalCardProps) {
  const now = useNow(1000);
  const { label, status, valueText, unit } = evaluation;

  return (
    <Card className={`vital vital--${status}`} title={label} aside={<StatusPill status={status} />}>
      <div className="vital__value">
        <span className="vital__num">{valueText}</span>
        <span className="vital__unit">{unit}</span>
      </div>
      <Sparkline values={values} height={44} band={personal} className="vital__spark" />
      <footer className="vital__foot">
        <div>
          <div>
            Your normal <b>{rangeText(personal, digits)}</b>
          </div>
          <div>
            General ref <b>{rangeText(general, digits)}</b>
          </div>
        </div>
        <span className="vital__age">{ageLabel(Math.max(0, now - sampleAt))}</span>
      </footer>
    </Card>
  );
}
