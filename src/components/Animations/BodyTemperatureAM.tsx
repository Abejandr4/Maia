const illustration = new URL('./assets/body-temperature-a-m.png', import.meta.url).href;

export default function BodyTemperatureAM() {
  return (
    <img
      src={illustration}
      alt="The male crew member rests and drinks water before repeating the temperature check."
      style={{ display: 'block', width: '100%', height: 'auto' }}
    />
  );
}
