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
    localStorage.setItem('userConsent', JSON.stringify(DEMO_CONSENT));
    localStorage.setItem('userProfile', JSON.stringify(DEMO_PROFILE));
    localStorage.setItem('hasCompletedSetup', 'true');
  } catch {
    /* storage unavailable */
  }
}