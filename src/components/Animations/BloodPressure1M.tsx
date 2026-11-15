const illustration = new URL('./assets/blood-pressure-1-m.png', import.meta.url).href;

export default function BloodPressure1M() {
  return (
    <img
      src={illustration}
      alt="The male crew member stands still with both feet secured in a blue restraint."
      style={{ display: 'block', width: '100%', height: 'auto' }}
    />
  );
}
