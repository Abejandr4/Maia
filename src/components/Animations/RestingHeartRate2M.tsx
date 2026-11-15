const illustration = new URL('./assets/resting-heart-rate-2-m.png', import.meta.url).href;

export default function RestingHeartRate2M() {
  return (
    <img
      src={illustration}
      alt="The male crew member counts a resting pulse at the wrist."
      style={{ display: 'block', width: '100%', height: 'auto' }}
    />
  );
}
