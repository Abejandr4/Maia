const illustration = new URL('./assets/oxygen-2-m.png', import.meta.url).href;

export default function Oxygen2M() {
  return (
    <img
      src={illustration}
      alt="The male crew member places a pulse oximeter on a finger with an unpainted nail."
      style={{ display: 'block', width: '100%', height: 'auto' }}
    />
  );
}
