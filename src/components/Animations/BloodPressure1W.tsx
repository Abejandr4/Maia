const illustration = new URL('./assets/blood-pressure-1-w.png', import.meta.url).href;

export default function BloodPressure1W() {
  return (
    <img
      src={illustration}
      alt="Maia stands still with both feet secured in a blue restraint."
      style={{ display: 'block', width: '100%', height: 'auto' }}
    />
  );
}
