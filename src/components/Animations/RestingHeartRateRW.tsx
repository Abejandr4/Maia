const illustration = new URL('./assets/resting-heart-rate-r-w.png', import.meta.url).href;

export default function RestingHeartRateRW() {
  return (
    <img
      src={illustration}
      alt="Maia stops the pulse check and opens the guide on a handheld display."
      style={{ display: 'block', width: '100%', height: 'auto' }}
    />
  );
}
