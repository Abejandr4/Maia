const illustration = new URL('./assets/resting-heart-rate-a-w.png', import.meta.url).href;

export default function RestingHeartRateAW() {
  return (
    <img
      src={illustration}
      alt="Maia rests on the cabin bench and drinks water."
      style={{ display: 'block', width: '100%', height: 'auto' }}
    />
  );
}
