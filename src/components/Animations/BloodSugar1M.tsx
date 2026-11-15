import MeasurementScene from './MeasurementScene';

export default function BloodSugar1M() {
  return (
    <MeasurementScene avatar="M" title={"Blood sugar (fasting)"} marker="1" cue="timer"
      caption={"Measure in the morning before eating"} />
  );
}
