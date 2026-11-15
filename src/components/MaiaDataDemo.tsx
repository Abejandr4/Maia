// Demo panel: shows that the app reads the real and synthetic analysis results.
// Use it as an example and move each part to the screen where it belongs.
import { report, reportSection, reportSizeKb, labReal, immune, evaluation, daily, SAMPLE_LABEL } from '../data/maiaData'
import type { MarkedChange } from '../data/maiaData'

type Header = { crew_member: string; mission_day: number; data_completeness_pct: number; disclaimer: string }
type Changes = { changes: (Partial<MarkedChange> & { measurement: string; direction: string; detected_day: number; confidence: string; level: string })[] }

export default function MaiaDataDemo() {
  const header = reportSection<Header>('Header')
  const changes = reportSection<Changes>('Ordered changes')?.changes ?? []
  const firstReview = immune.timeline.find((d) => d.immune_review !== '')
  const glucose = labReal.data_quality.find((q) => q.test_id === 'glucose')

  return (
    <div style={{ padding: 16, fontFamily: 'system-ui, sans-serif', lineHeight: 1.5 }}>
      <h2>Report for the flight surgeon <small>({SAMPLE_LABEL})</small></h2>
      {header && (
        <p>
          {header.crew_member} · mission day {header.mission_day} · data completeness {header.data_completeness_pct}% ·{' '}
          {reportSizeKb()} KB · <em>{header.disclaimer}</em>
        </p>
      )}
      <ol>
        {changes.map((c, i) => (
          <li key={i}>
            {c.measurement} {c.direction} · detected day {c.detected_day} · confidence {c.confidence}
          </li>
        ))}
      </ol>

      <h2>Immune case <small>({SAMPLE_LABEL})</small></h2>
      {firstReview && (
        <p>
          “{firstReview.immune_review}” on day {firstReview.day}: {firstReview.n_domains} domains
          (cellular {firstReview.cellular}, viral {firstReview.viral}, clinical {firstReview.clinical}).
          Baseline: {immune.baseline_crew}.
        </p>
      )}

      <h2>Real data – {labReal.dataset}</h2>
      <p><em>{labReal.caveat}</em></p>
      {glucose && (
        <p>
          Glucose {glucose.timepoint}: {glucose.crew_outside} of {glucose.crew_total} crew below range, back by{' '}
          {glucose.next_timepoint} → {glucose.message}
        </p>
      )}

      <h2>How well the method works <small>(our calculation, {evaluation[0]?.runs} simulated missions)</small></h2>
      <table>
        <thead>
          <tr><th>Test</th><th>Detection %</th><th>False alarms / 100 crew-days</th><th>Days to detect</th></tr>
        </thead>
        <tbody>
          {evaluation.filter((r) => r.section !== 'D analytic').map((r, i) => (
            <tr key={i}>
              <td>{r.item}</td>
              <td>{r.detection_rate_pct ?? '–'}</td>
              <td>{r.false_alarms_per_100_crew_days ?? '–'}</td>
              <td>{r.days_to_detection_median ?? '–'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p><small>Daily data are synthetic ({daily.label}); {report.label} values are generated, not measured.</small></p>
    </div>
  )
}
