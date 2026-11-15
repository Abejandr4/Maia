const illustration = new URL('./assets/body-temperature-1-m.png', import.meta.url).href;

export default function BodyTemperature1M() {
  return (
    <img
      src={illustration}
      alt="The male crew member holds a forehead temperature sensor near their forehead."
      style={{ display: 'block', width: '100%', height: 'auto' }}
    />
  );
}
