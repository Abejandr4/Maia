import MeasurementScene from './MeasurementScene';

export default function BreathingRateAM() {
  return (
    <MeasurementScene avatar="M" title={"Breathing rate"} marker="A" cue="timer"
      caption={"Rest and count again in 5 minutes."} />
  );
}
