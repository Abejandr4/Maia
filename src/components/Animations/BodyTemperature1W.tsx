const illustration = new URL('./assets/body-temperature-1-w.png', import.meta.url).href;

export default function BodyTemperature1W() {
  return (
    <img
      src={illustration}
      alt="Maia holds a forehead temperature sensor near their forehead."
      style={{ display: 'block', width: '100%', height: 'auto' }}
    />
  );
}
