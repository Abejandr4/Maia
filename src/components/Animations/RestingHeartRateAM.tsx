const illustration = new URL('./assets/resting-heart-rate-a-m.png', import.meta.url).href;

export default function RestingHeartRateAM() {
  return (
    <img
      src={illustration}
      alt="The male crew member rests on the cabin bench and drinks water."
      style={{ display: 'block', width: '100%', height: 'auto' }}
    />
  );
}
