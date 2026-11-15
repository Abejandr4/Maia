const illustration = new URL('./assets/blood-pressure-4-m.png', import.meta.url).href;

export default function BloodPressure4M() {
  return (
    <img
      src={illustration}
      alt="The male crew member holds a finger to the lips while wearing an upper-arm blood pressure cuff."
      style={{ display: 'block', width: '100%', height: 'auto' }}
    />
  );
}
