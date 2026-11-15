import MeasurementScene from './MeasurementScene';

export default function BreathingRateRM() {
  return (
    <MeasurementScene avatar="M" title={"Breathing rate"} marker="R" cue="lungs"
      caption={"Sit up, check oxygen and open the guide."} />
  );
}
