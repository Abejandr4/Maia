const illustration = new URL('./assets/resting-heart-rate-1-m.png', import.meta.url).href;

export default function RestingHeartRate1M() {
  return (
    <img
      src={illustration}
      alt="The male crew member sits quietly on a cabin bench with both feet secured in restraints."
      style={{ display: 'block', width: '100%', height: 'auto' }}
    />
  );
}
