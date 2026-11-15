const illustration = new URL('./assets/body-mass-1-w.png', import.meta.url).href;

export default function BodyMass1W() {
  return (
    <img
      src={illustration}
      alt="Maia uses an inertial body-mass measuring device in the cabin."
      style={{ display: 'block', width: '100%', height: 'auto' }}
    />
  );
}
