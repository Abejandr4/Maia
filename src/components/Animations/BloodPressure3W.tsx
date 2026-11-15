const illustration = new URL('./assets/blood-pressure-3-w.png', import.meta.url).href;

export default function BloodPressure3W() {
  return (
    <img
      src={illustration}
      alt="Maia checks a handheld blood pressure monitor while standing in foot restraints."
      style={{ display: 'block', width: '100%', height: 'auto' }}
    />
  );
}
