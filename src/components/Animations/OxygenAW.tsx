const illustration = new URL('./assets/oxygen-a-w.png', import.meta.url).href;

export default function OxygenAW() {
  return (
    <img
      src={illustration}
      alt="Maia warms her hands before repeating the pulse oximeter reading."
      style={{ display: 'block', width: '100%', height: 'auto' }}
    />
  );
}
