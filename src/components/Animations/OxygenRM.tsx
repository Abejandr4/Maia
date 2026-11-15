const illustration = new URL('./assets/oxygen-r-m.png', import.meta.url).href;

export default function OxygenRM() {
  return (
    <img
      src={illustration}
      alt="The male crew member sits upright and opens the guide on a handheld display."
      style={{ display: 'block', width: '100%', height: 'auto' }}
    />
  );
}
