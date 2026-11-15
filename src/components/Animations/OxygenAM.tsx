const illustration = new URL('./assets/oxygen-a-m.png', import.meta.url).href;

export default function OxygenAM() {
  return (
    <img
      src={illustration}
      alt="The male crew member warms his hands before repeating the pulse oximeter reading."
      style={{ display: 'block', width: '100%', height: 'auto' }}
    />
  );
}
