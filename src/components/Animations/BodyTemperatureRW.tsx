const illustration = new URL('./assets/body-temperature-r-w.png', import.meta.url).href;

export default function BodyTemperatureRW() {
  return (
    <img
      src={illustration}
      alt="Maia stops exercising, cools down, and opens the guide."
      style={{ display: 'block', width: '100%', height: 'auto' }}
    />
  );
}
