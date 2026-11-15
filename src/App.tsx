import { useCallback, useState } from "react";
import "./App.css";
import type { PageId } from "./utils/types";
import { VitalsProvider, useVitals } from "./utils/VitalsContext";
import TopBar from "./components/layout/TopBar";
import AlertBanner from "./components/layout/AlertBanner";
import Modal from "./components/ui/Modal";
import { SymptomLog } from "./components/external";
import HomePage from "./pages/HomePage";
import BodySensorsPage from "./pages/BodySensorsPage";
import EnvironmentPage from "./pages/EnvironmentPage";
import ReportPage from "./pages/ReportPage";
import ConsentPage from './pages/Initial record/ConsentPage';
import AboutYouPage from './pages/Initial record/AboutyouPage';
import MedicalHistoryPage from './pages/Initial record/MedicalHistoryPage';
import FlightHistoryPage from './pages/Initial record/FlightHistoryPage';
import YourNormalValuesPage from './pages/Initial record/YourNormalValuesPage';
import MissionSchedulePage from './pages/Initial record/MissionSchedulePage';
import MeetMaiaPage from './pages/Initial record/MeetMaiaPage';
import EmergencyButton from "./components/emergency/EmergencyButton";
import EmergencyScreen, {
  type EmergencyReport,
} from "./components/emergency/EmergencyScreen";
import { ASTRONAUT } from "./utils/mockData";

function Shell() {
  const [page, setPage] = useState<PageId>("home");
  const [logOpen, setLogOpen] = useState(false);
  const [emergencyOpen, setEmergencyOpen] = useState(false);
  const { addSymptom } = useVitals();

  const openLog = useCallback(() => setLogOpen(true), []);
  const closeLog = useCallback(() => setLogOpen(false), []);
  const closeEmergency = useCallback(() => setEmergencyOpen(false), []);

  // Replace the timeout with your real ground-link call
  const sendEmergency = useCallback(
    async (report: EmergencyReport) => {
      await new Promise((r) => setTimeout(r, 1400));
      addSymptom({
        name: report.emergency.guideTitle,
        severity: report.emergency.priority === "minor" ? "moderate" : "severe",
        note: `Emergency report sent${report.photos.length ? ` with ${report.photos.length} photo(s)` : ""}.`,
        time: report.emergency.startedAt,
      });
    },
    [addSymptom],
  );
  const navigate = useCallback((p: PageId) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <div
      className={`app app--${page} ${page === "environment" ? "theme-dark" : ""}`}
    >
      <TopBar
        page={page}
        onNavigate={navigate}
        onLogSymptom={openLog}
        emergencySlot={
          <EmergencyButton onClick={() => setEmergencyOpen(true)} />
        }
      />

      <main className="app-main">
        <AlertBanner />
        {page === "home" && <HomePage onNavigate={navigate} />}
        {page === "body" && <BodySensorsPage onLogSymptom={openLog} />}
        {page === "environment" && <EnvironmentPage />}
        {page === "report" && <ReportPage onLogSymptom={openLog} />}
      </main>

      <Modal open={logOpen} onClose={closeLog} title="Log a symptom">
        <SymptomLog onClose={closeLog} onSubmit={addSymptom} />
      </Modal>

      {emergencyOpen && (
        <EmergencyScreen
          open
          onClose={closeEmergency}
          crew={{
            id: "CM-01",
            name: ASTRONAUT.name,
            mission: "Space Apps 2026",
          }}
          onSend={sendEmergency}
        />
      )}
    </div>
  );
}

type SetupStep =
  | 'consent'
  | 'aboutYou'
  | 'medicalHistory'
  | 'flightHistory'
  | 'normalValues'
  | 'missionSchedule'
  | 'meetMaia'
  | 'done';

export default function App() {
  const [setupStep, setSetupStep] = useState<SetupStep>(() => {
    try {
      return localStorage.getItem('hasCompletedSetup') === 'true' ? 'done' : 'consent';
    } catch {
      return 'consent';
    }
  });

  const handleFinishOnboarding = () => {
    try {
      localStorage.setItem('hasCompletedSetup', 'true');
    } catch {
      // Ignorar si localStorage no está disponible
    }
    setSetupStep('done');
  };

  return (
    <VitalsProvider>
      {setupStep === 'consent' && (
     <ConsentPage onComplete={() => setSetupStep('aboutYou')} />
)}
      {setupStep === 'aboutYou' && (
        <AboutYouPage
          onBack={() => setSetupStep('consent')}
          onComplete={() => setSetupStep('medicalHistory')}
        />
      )}

      {setupStep === 'medicalHistory' && (
        <MedicalHistoryPage
          onBack={() => setSetupStep('aboutYou')}
          onSkip={() => setSetupStep('flightHistory')}
          onComplete={() => setSetupStep('flightHistory')}
        />
      )}

      {setupStep === 'flightHistory' && (
        <FlightHistoryPage
          onBack={() => setSetupStep('medicalHistory')}
          onSkip={() => setSetupStep('normalValues')}
          onComplete={() => setSetupStep('normalValues')}
        />
      )}

      {setupStep === 'normalValues' && (
        <YourNormalValuesPage
          onBack={() => setSetupStep('flightHistory')}
          onComplete={() => setSetupStep('missionSchedule')}
        />
      )}

      {setupStep === 'missionSchedule' && (
        <MissionSchedulePage
          onBack={() => setSetupStep('normalValues')}
          onComplete={handleFinishOnboarding}
        />
      )}
      {setupStep === 'missionSchedule' && (
   <MissionSchedulePage
     onBack={() => setSetupStep('normalValues')}
     onComplete={() => setSetupStep('meetMaia')}
   />
 )}

 {setupStep === 'meetMaia' && (
   <MeetMaiaPage
     onBack={() => setSetupStep('missionSchedule')}
     onComplete={handleFinishOnboarding}
   />
 )}

 {setupStep === 'done' && <Shell />}

      {setupStep === 'done' && <Shell />}
          </VitalsProvider>
  );
}