const illustration = new URL('./assets/blood-pressure-4-w.png', import.meta.url).href;

export default function BloodPressure4W() {
  return (
    <img
      src={illustration}
      alt="Maia holds a finger to the lips while wearing an upper-arm blood pressure cuff."
      style={{ display: 'block', width: '100%', height: 'auto' }}
    />
  );
}
