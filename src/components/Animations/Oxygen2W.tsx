const illustration = new URL('./assets/oxygen-2-w.png', import.meta.url).href;

export default function Oxygen2W() {
  return (
    <img
      src={illustration}
      alt="Maia places a pulse oximeter on a finger with an unpainted nail."
      style={{ display: 'block', width: '100%', height: 'auto' }}
    />
  );
}
