const illustration = new URL('./assets/resting-heart-rate-r-m.png', import.meta.url).href;

export default function RestingHeartRateRM() {
  return (
    <img
      src={illustration}
      alt="The male crew member stops the pulse check and opens the guide on a handheld display."
      style={{ display: 'block', width: '100%', height: 'auto' }}
    />
  );
}
