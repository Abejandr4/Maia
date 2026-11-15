const illustration = new URL('./assets/body-mass-a-w.png', import.meta.url).href;

export default function BodyMassAW() {
  return (
    <img
      src={illustration}
      alt="Maia reviews a week of food and drink records."
      style={{ display: 'block', width: '100%', height: 'auto' }}
    />
  );
}
