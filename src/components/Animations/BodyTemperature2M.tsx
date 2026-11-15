const illustration = new URL('./assets/body-temperature-2-m.png', import.meta.url).href;

export default function BodyTemperature2M() {
  return (
    <img
      src={illustration}
      alt="The male crew member rests before a temperature check at the usual time."
      style={{ display: 'block', width: '100%', height: 'auto' }}
    />
  );
}
