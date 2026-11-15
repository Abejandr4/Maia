const illustration = new URL('./assets/oxygen-3-m.png', import.meta.url).href;

export default function Oxygen3M() {
  return (
    <img
      src={illustration}
      alt="The male crew member waits for the fingertip pulse oximeter reading to stabilize."
      style={{ display: 'block', width: '100%', height: 'auto' }}
    />
  );
}
