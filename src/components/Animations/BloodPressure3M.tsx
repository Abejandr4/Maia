const illustration = new URL('./assets/blood-pressure-3-m.png', import.meta.url).href;

export default function BloodPressure3M() {
  return (
    <img
      src={illustration}
      alt="The male crew member checks a handheld blood pressure monitor while standing in foot restraints."
      style={{ display: 'block', width: '100%', height: 'auto' }}
    />
  );
}
