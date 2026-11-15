const illustration = new URL('./assets/oxygen-3-w.png', import.meta.url).href;

export default function Oxygen3W() {
  return (
    <img
      src={illustration}
      alt="Maia waits for the fingertip pulse oximeter reading to stabilize."
      style={{ display: 'block', width: '100%', height: 'auto' }}
    />
  );
}
