import MeasurementScene from './MeasurementScene';

export default function BloodSugar2W() {
  return (
    <MeasurementScene avatar="W" title={"Blood sugar (fasting)"} marker="2" cue="glucose"
      caption={"Use the glucose meter as trained"} />
  );
}
