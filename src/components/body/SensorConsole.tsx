import type { Scenario } from '../../utils/types';
import { SCENARIOS } from '../../utils/sensorSim';
import { speechAvailable } from '../../utils/tts';
import { useVitals } from '../../utils/VitalsContext';
import Card from '../ui/Card';
import Icon from '../ui/Icon';
import './body.css';

const SIMS: Scenario[] = ['hypertension', 'tachycardia', 'hypoxia', 'fever'];

/** Sensor simulation + alert override console (demo inputs). */
export default function SensorConsole() {
  const { scenario, setScenario, paused, setPaused, evaMode, setEvaMode, voiceOn, setVoiceOn, testVoice } = useVitals();

  return (
    <Card className="console" title="Alert override console" aside={<span>Demo inputs · chest sensor feed</span>}>
      <p className="console__lede">
        Simulate sensor conditions to hear the crew alert exactly as the cabin{evaMode ? ' — or the suit, on EVA —' : ''} would speak it.
        {!speechAvailable() && ' (Speech is not available in this browser; alerts show on screen only.)'}
      </p>

      <div className="console__grid">
        {SIMS.map((k) => {
          const s = SCENARIOS[k];
          const active = scenario === k;
          return (
            <button
              key={k}
              type="button"
              className={`sim-btn sim-btn--${s.severity} ${active ? 'is-active' : ''}`}
              aria-pressed={active}
              onClick={() => setScenario(active ? 'nominal' : k)}
            >
              <Icon name="bolt" size={18} />
              <span>
                <span className="sim-btn__label">Simulate {s.label}</span>
                <span className="sim-btn__detail">{s.detail}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="console__row">
        <button type="button" className="btn" onClick={() => setPaused(!paused)}>
          <Icon name={paused ? 'play' : 'pause'} />
          {paused ? 'Resume feed' : 'Pause feed'}
        </button>
        <button type="button" className="btn" onClick={() => setScenario('nominal')}>
          <Icon name="reset" />
          Back to nominal
        </button>
        <label className="toggle">
          <input type="checkbox" checked={evaMode} onChange={(e) => setEvaMode(e.target.checked)} />
          <span>EVA mode</span>
        </label>
        <label className="toggle">
          <input type="checkbox" checked={voiceOn} onChange={(e) => setVoiceOn(e.target.checked)} />
          <span>Voice alerts</span>
        </label>
        <button type="button" className="btn btn--ghost btn--sm" onClick={testVoice}>
          <Icon name="volume" />
          Test voice
        </button>
        <span className="console__mode">
          Mode: {scenario === 'nominal' ? 'nominal' : `${SCENARIOS[scenario].label.toLowerCase()} (simulated)`}
          {paused ? ' · paused' : ''}
        </span>
      </div>
    </Card>
  );
}
