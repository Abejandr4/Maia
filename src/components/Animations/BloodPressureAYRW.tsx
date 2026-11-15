const illustration = new URL('./assets/blood-pressure-ayr-w.png', import.meta.url).href;

export default function BloodPressureAYRW() {
  return (
    <img
      src={illustration}
      alt="Maia sits and reviews a blood pressure reading, with a repeat-reading reminder."
      style={{ display: 'block', width: '100%', height: 'auto' }}
    />
  );
}
