export const DEMO_CONSENT = { storeLocal: true, shareTeam: true };

export const DEMO_PROFILE = {
  fullName: 'Ana Ruiz',
  age: 38,
  sex: 'Female' as const,
  crewRole: 'Flight Engineer',
  height: 165,
  weight: 61.2,
  avatarId: 'female-1',
  avatarStyle: 'lilac',
};

/** Writes everything setup would save, then marks setup as finished. */
export function saveDemoSetup() {
  try {
    saveDemoAnswers();
    localStorage.setItem('userConsent', JSON.stringify(DEMO_CONSENT));
    localStorage.setItem('userProfile', JSON.stringify(DEMO_PROFILE));
    localStorage.setItem('hasCompletedSetup', 'true');
  } catch {
    /* storage unavailable */
  }
}

/* ---------- Sample answers for every setup step (Autofill demo) ----------
 * Sources: profile = DEMO_PROFILE above; blood pressure, pulse, temperature, SpO2,
 * mission schedule and contacts = the defaults already in each setup page;
 * flight history and usual sleep = the example values shown in those fields.
 * moodScore = demo choice [UNVERIFIED]. Sample person, not real data (is_synthetic = yes). */
export const DEMO_ANSWERS = {
  medicalHistory: {
    conditions: ['None'],
    allergies: [] as string[],
    currentMedications: 'None',
    pastSurgeries: 'None',
    vaccinesUpToDate: true,
    wearsGlassesOrContacts: false,
  },
  flightHistory: { previousMissions: 1, totalDaysInSpace: 186, accumulatedRadiationMsv: 92.4, spacewalks: 2 },
  normalValues: {
    bloodPressure: { systolic: 124, diastolic: 78, done: true },
    pulseBpm: { value: 64, done: true },
    temperatureC: { value: 36.6, done: true },
    spo2Percent: { value: 98, done: true },
    weightKg: { value: DEMO_PROFILE.weight, done: true },
    usualSleepHours: { value: 7.5, done: true },
    moodScore: { value: 4, done: true },
  },
  missionSchedule: {
    missionType: 'ISS Expedition 74',
    duration: '6 months',
    currentLocation: 'iss',
    bedtimeGmt: '22:00',
    wakeupTimeGmt: '06:00',
  },
  emergencyContacts: {
    flightSurgeon: { name: 'Dr. L. Moreno', channel: 'Mission Control \u00B7 medical loop' },
    crewMedicalOfficer: { name: 'K. Tanaka', onBoard: 'Yes' },
    earthContact: { name: 'Luc\u00EDa Ruiz (daughter)', phone: '' },
  },
};

/** Fills every setup step with the sample answers (does not finish setup). */
export function saveDemoAnswers() {
  try {
    localStorage.setItem('userProfile', JSON.stringify(DEMO_PROFILE));
    for (const [key, value] of Object.entries(DEMO_ANSWERS)) {
      localStorage.setItem(key, JSON.stringify(value));
    }
  } catch {
    /* storage unavailable */
  }
}
