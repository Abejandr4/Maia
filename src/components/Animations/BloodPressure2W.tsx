const illustration = new URL('./assets/blood-pressure-2-w.png', import.meta.url).href;

export default function BloodPressure2W() {
  return (
    <img
      src={illustration}
      alt="Maia wears a blue blood pressure cuff on her left upper arm."
      style={{ display: 'block', width: '100%', height: 'auto' }}
    />
  );
}
