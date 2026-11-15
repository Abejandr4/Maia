import MeasurementScene from './MeasurementScene';

export default function BloodSugar2M() {
  return (
    <MeasurementScene avatar="M" title={"Blood sugar (fasting)"} marker="2" cue="glucose"
      caption={"Use the glucose meter as trained"} />
  );
}
