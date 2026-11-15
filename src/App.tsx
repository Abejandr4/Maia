import { useCallback, useState } from "react";
import "./App.css";
import type { PageId } from "./utils/types";
import { VitalsProvider, useVitals } from "./utils/VitalsContext";
import TopBar from "./components/layout/TopBar";
import AlertBanner from "./components/layout/AlertBanner";
import Modal from "./components/ui/Modal";
import { SymptomLog } from "./components/external";
import LandingPage from "./pages/LandingPage";
import HomePage from "./pages/HomePage";
import EvaVisor from "./components/body/EvaVisor";
import BodySensorsPage from "./pages/BodySensorsPage";
import EnvironmentPage from "./pages/EnvironmentPage";
import ReportPage from "./pages/ReportPage";
import ConsentPage from "./pages/Initial record/ConsentPage";
import AboutYouPage from "./pages/Initial record/AboutyouPage";
import MedicalHistoryPage from "./pages/Initial record/MedicalHistoryPage";
import FlightHistoryPage from "./pages/Initial record/FlightHistoryPage";
import YourNormalValuesPage from "./pages/Initial record/YourNormalValuesPage";
import MissionSchedulePage from "./pages/Initial record/MissionSchedulePage";
import MeetMaiaPage from "./pages/Initial record/MeetMaiaPage";
import ContactsPage from "./pages/Initial record/ContactsPage";
import EmergencyButton from "./components/emergency/EmergencyButton";
import EmergencyScreen, {
  type EmergencyReport,
} from "./components/emergency/EmergencyScreen";
import { saveDemoSetup } from "./utils/demoProfile";
import { ASTRONAUT } from "./utils/mockData";

/* ------------------------------------------------------------------ */
/* Main app (after setup)                                              */
/* ------------------------------------------------------------------ */


/** Shown at the foot of every screen of the app. */
function Disclaimer() {
  return (
    <footer className="app-disclaimer">
      <b>Prototype · Not for medical use.</b> Sample data generated with Claude Opus 5.5 (synthetic, is_synthetic = yes) alongside public NASA data (OSDR).
    </footer>
  );
}

function Shell() {
  const [page, setPage] = useState<PageId>("home");
  const [logOpen, setLogOpen] = useState(false);
  const [emergencyOpen, setEmergencyOpen] = useState(false);
  const { addSymptom, evaMode } = useVitals();

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
    <>
      {evaMode && (
        <div className="eva-shell">
          <EvaVisor />
          <Disclaimer />
        </div>
      )}
      <div
        hidden={evaMode}
        style={evaMode ? { display: "none" } : undefined}
        className={`app app--${page} ${page === "environment" ? "theme-dark" : ""}`}
      >
        <TopBar
          page={page}
          onNavigate={navigate}
          onLogSymptom={openLog}
          emergencySlot={<EmergencyButton onClick={() => setEmergencyOpen(true)} />}
        />

        <main className="app-main">
          <AlertBanner />
          {page === "home" && <HomePage onNavigate={navigate} />}
          {page === "body" && <BodySensorsPage onLogSymptom={openLog} />}
          {page === "environment" && <EnvironmentPage />}
          {page === "report" && <ReportPage onLogSymptom={openLog} />}
        </main>
        <Disclaimer />

        <Modal open={logOpen} onClose={closeLog} title="Log a symptom">
          <SymptomLog onClose={closeLog} onSubmit={addSymptom} />
        </Modal>

        {emergencyOpen && (
          <EmergencyScreen
            open
            onClose={closeEmergency}
            crew={{ id: "CM-01", name: ASTRONAUT.name, mission: "Space Apps 2026" }}
            onSend={sendEmergency}
          />
        )}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Landing → 8 setup steps → app                                       */
/* ------------------------------------------------------------------ */

type SetupStep =
  | "landing"
  | "consent"
  | "aboutYou"
  | "medicalHistory"
  | "flightHistory"
  | "normalValues"
  | "missionSchedule"
  | "meetMaia"
  | "contacts"
  | "done";

export default function App() {
  const [setupStep, setSetupStep] = useState<SetupStep>(() => {
    try {
      return localStorage.getItem("hasCompletedSetup") === "true" ? "done" : "landing";
    } catch {
      return "landing";
    }
  });

  const goTo = useCallback((step: SetupStep) => {
    setSetupStep(step);
    window.scrollTo({ top: 0 });
  }, []);

  const handleFinishOnboarding = () => {
    try {
      localStorage.setItem("hasCompletedSetup", "true");
    } catch {
      // Ignore if localStorage is unavailable
    }
    goTo("done");
  };

  const skipWithDemo = () => {
    saveDemoSetup();
    goTo("done");
  };

  return (
    <VitalsProvider>
      {setupStep === "landing" && (
        <LandingPage onStart={() => goTo("consent")} onDemo={skipWithDemo} />
      )}

      {setupStep === "consent" && <ConsentPage onComplete={() => goTo("aboutYou")} />}

      {setupStep === "aboutYou" && (
        <AboutYouPage onBack={() => goTo("consent")} onComplete={() => goTo("medicalHistory")} />
      )}

      {setupStep === "medicalHistory" && (
        <MedicalHistoryPage
          onBack={() => goTo("aboutYou")}
          onSkip={() => goTo("flightHistory")}
          onComplete={() => goTo("flightHistory")}
        />
      )}

      {setupStep === "flightHistory" && (
        <FlightHistoryPage
          onBack={() => goTo("medicalHistory")}
          onSkip={() => goTo("normalValues")}
          onComplete={() => goTo("normalValues")}
        />
      )}

      {setupStep === "normalValues" && (
        <YourNormalValuesPage onBack={() => goTo("flightHistory")} onComplete={() => goTo("missionSchedule")} />
      )}

      {setupStep === "missionSchedule" && (
        <MissionSchedulePage onBack={() => goTo("normalValues")} onComplete={() => goTo("meetMaia")} />
      )}

      {setupStep === "meetMaia" && (
        <MeetMaiaPage onBack={() => goTo("missionSchedule")} onComplete={() => goTo("contacts")} />
      )}

      {setupStep === "contacts" && (
        <ContactsPage
          onBack={() => goTo("meetMaia")}
          onSkip={handleFinishOnboarding}
          onComplete={handleFinishOnboarding}
        />
      )}

      {/* Floating demo skip during setup (the landing page has its own link) */}
      {setupStep !== "done" && setupStep !== "landing" && (
        <button type="button" className="demo-skip" onClick={skipWithDemo}>
          Skip setup · demo profile
        </button>
      )}

      {setupStep === "done" && <Shell />}
    </VitalsProvider>
  );
}