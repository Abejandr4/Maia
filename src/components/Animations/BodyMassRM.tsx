const illustration = new URL('./assets/body-mass-r-m.png', import.meta.url).href;

export default function BodyMassRM() {
  return (
    <img
      src={illustration}
      alt="The male crew member reviews a body-mass trend for the medical team."
      style={{ display: 'block', width: '100%', height: 'auto' }}
    />
  );
}
