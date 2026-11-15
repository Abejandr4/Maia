import { useState } from 'react';
import { reportSection } from '../data/maiaData';
import PageHeader from '../components/ui/PageHeader';
import AstronautView from '../components/maia/report/AstronautView';
import DoctorView from '../components/maia/report/DoctorView';
import '../components/maia/maia.css';
import './pages.css';

/**
 * Reports = one letter per downlink for the flight surgeon.
 * The astronaut sees it in plain words; "Preview what your doctor sees" opens the technical, read-only console.
 */
export default function ReportPage({ onLogSymptom }: { onLogSymptom: () => void }) {
  const [doctor, setDoctor] = useState(false);
  const [note, setNote] = useState('');
  const [sent, setSent] = useState(false);
  const send = reportSection<{ size_kb: number }>('Send');
  const sizeKb = (send?.size_kb ?? 0) + new Blob([note]).size / 1024;
  const go = (d: boolean) => {
    setDoctor(d);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (doctor) {
    return (
      <div className="page page--report">
        <DoctorView note={note} sizeKb={sizeKb} sent={sent} onBack={() => go(false)} />
      </div>
    );
  }

  return (
    <div className="page page--report">
      <PageHeader
        eyebrow="Downlink · next pass"
        title="Reports"
        subtitle="One letter per downlink, ranked by what changed most."
        aside={
          <button type="button" className="btn" onClick={() => go(true)}>
            Preview what your doctor sees
          </button>
        }
      />
      <AstronautView
        note={note}
        setNote={(v) => {
          setNote(v);
          setSent(false);
        }}
        sent={sent}
        onSend={() => setSent(true)}
        sizeKb={sizeKb}
        onLogSymptom={onLogSymptom}
        onShowDoctor={() => go(true)}
      />
    </div>
  );
}
