import MeasurementScene from './MeasurementScene';

export default function BloodSugar1W() {
  return (
    <MeasurementScene avatar="W" title={"Blood sugar (fasting)"} marker="1" cue="timer"
      caption={"Measure in the morning before eating"} />
  );
}
