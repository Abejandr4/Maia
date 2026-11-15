const illustration = new URL('./assets/oxygen-1-w.png', import.meta.url).href;

export default function Oxygen1W() {
  return (
    <img
      src={illustration}
      alt="Maia warms their hands by gently rubbing their palms together."
      style={{ display: 'block', width: '100%', height: 'auto' }}
    />
  );
}
