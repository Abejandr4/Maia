const illustration = new URL('./assets/blood-pressure-2-m.png', import.meta.url).href;

export default function BloodPressure2M() {
  return (
    <img
      src={illustration}
      alt="The male crew member wears a blue blood pressure cuff on his left upper arm."
      style={{ display: 'block', width: '100%', height: 'auto' }}
    />
  );
}
