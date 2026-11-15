const illustration = new URL('./assets/body-temperature-a-w.png', import.meta.url).href;

export default function BodyTemperatureAW() {
  return (
    <img
      src={illustration}
      alt="Maia rests and drinks water before repeating the temperature check."
      style={{ display: 'block', width: '100%', height: 'auto' }}
    />
  );
}
