const illustration = new URL('./assets/body-mass-a-m.png', import.meta.url).href;

export default function BodyMassAM() {
  return (
    <img
      src={illustration}
      alt="The male crew member reviews a week of food and drink records."
      style={{ display: 'block', width: '100%', height: 'auto' }}
    />
  );
}
