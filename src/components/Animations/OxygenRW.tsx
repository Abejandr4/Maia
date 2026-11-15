const illustration = new URL('./assets/oxygen-r-w.png', import.meta.url).href;

export default function OxygenRW() {
  return (
    <img
      src={illustration}
      alt="Maia sits upright and opens the guide on a handheld display."
      style={{ display: 'block', width: '100%', height: 'auto' }}
    />
  );
}
