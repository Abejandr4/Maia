const illustration = new URL('./assets/oxygen-1-m.png', import.meta.url).href;

export default function Oxygen1M() {
  return (
    <img
      src={illustration}
      alt="The male crew member warms their hands by gently rubbing their palms together."
      style={{ display: 'block', width: '100%', height: 'auto' }}
    />
  );
}
