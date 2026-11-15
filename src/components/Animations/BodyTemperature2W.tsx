const illustration = new URL('./assets/body-temperature-2-w.png', import.meta.url).href;

export default function BodyTemperature2W() {
  return (
    <img
      src={illustration}
      alt="Maia rests before a temperature check at the usual time."
      style={{ display: 'block', width: '100%', height: 'auto' }}
    />
  );
}
