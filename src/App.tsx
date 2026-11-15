import { useCallback, useState } from 'react';
import './App.css';
import type { PageId } from './utils/types';
import { VitalsProvider, useVitals } from './utils/VitalsContext';
import TopBar from './components/layout/TopBar';
import AlertBanner from './components/layout/AlertBanner';
import Modal from './components/ui/Modal';
import { SymptomLog } from './components/external';
import HomePage from './pages/HomePage';
import BodySensorsPage from './pages/BodySensorsPage';
import EnvironmentPage from './pages/EnvironmentPage';
import ReportPage from './pages/ReportPage';

function Shell() {
  const [page, setPage] = useState<PageId>('home');
  const [logOpen, setLogOpen] = useState(false);
  const { addSymptom } = useVitals();

  const openLog = useCallback(() => setLogOpen(true), []);
  const closeLog = useCallback(() => setLogOpen(false), []);
  const navigate = useCallback((p: PageId) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <div className={`app app--${page} ${page === 'environment' ? 'theme-dark' : ''}`}>
      <TopBar
        page={page}
        onNavigate={navigate}
        onLogSymptom={openLog}
        emergencySlot={null /* <EmergencyButton /> goes here */}
      />

      <main className="app-main">
        <AlertBanner />
        {page === 'home' && <HomePage onNavigate={navigate} />}
        {page === 'body' && <BodySensorsPage onLogSymptom={openLog} />}
        {page === 'environment' && <EnvironmentPage />}
        {page === 'report' && <ReportPage onLogSymptom={openLog} />}
      </main>

      <Modal open={logOpen} onClose={closeLog} title="Log a symptom" width={760}>
        <SymptomLog onClose={closeLog} onSubmit={addSymptom} />
      </Modal>
    </div>
  );
}

export default function App() {
  return (
    <VitalsProvider>
      <Shell />
    </VitalsProvider>
  );
}
