import MeasurementScene from './MeasurementScene';

export default function BreathingRateRW() {
  return (
    <MeasurementScene avatar="W" title={"Breathing rate"} marker="R" cue="lungs"
      caption={"Sit up, check oxygen and open the guide."} />
  );
}
