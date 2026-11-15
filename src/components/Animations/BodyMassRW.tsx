const illustration = new URL('./assets/body-mass-r-w.png', import.meta.url).href;

export default function BodyMassRW() {
  return (
    <img
      src={illustration}
      alt="Maia reviews a body-mass trend for the medical team."
      style={{ display: 'block', width: '100%', height: 'auto' }}
    />
  );
}
