const illustration = new URL('./assets/resting-heart-rate-2-w.png', import.meta.url).href;

export default function RestingHeartRate2W() {
  return (
    <img
      src={illustration}
      alt="Maia counts a resting pulse at the wrist."
      style={{ display: 'block', width: '100%', height: 'auto' }}
    />
  );
}
