const illustration = new URL('./assets/body-temperature-r-m.png', import.meta.url).href;

export default function BodyTemperatureRM() {
  return (
    <img
      src={illustration}
      alt="The male crew member stops exercising, cools down, and opens the guide."
      style={{ display: 'block', width: '100%', height: 'auto' }}
    />
  );
}
