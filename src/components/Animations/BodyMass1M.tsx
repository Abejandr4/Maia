const illustration = new URL('./assets/body-mass-1-m.png', import.meta.url).href;

export default function BodyMass1M() {
  return (
    <img
      src={illustration}
      alt="The male crew member uses an inertial body-mass measuring device in the cabin."
      style={{ display: 'block', width: '100%', height: 'auto' }}
    />
  );
}
