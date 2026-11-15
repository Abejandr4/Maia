const illustration = new URL('./assets/blood-pressure-ayr-m.png', import.meta.url).href;

export default function BloodPressureAYRM() {
  return (
    <img
      src={illustration}
      alt="The male crew member sits and reviews a blood pressure reading, with a repeat-reading reminder."
      style={{ display: 'block', width: '100%', height: 'auto' }}
    />
  );
}
