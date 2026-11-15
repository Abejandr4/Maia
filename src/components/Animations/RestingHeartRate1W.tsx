const illustration = new URL('./assets/resting-heart-rate-1-w.png', import.meta.url).href;

export default function RestingHeartRate1W() {
  return (
    <img
      src={illustration}
      alt="Maia sits quietly on a cabin bench with both feet secured in restraints."
      style={{ display: 'block', width: '100%', height: 'auto' }}
    />
  );
}
