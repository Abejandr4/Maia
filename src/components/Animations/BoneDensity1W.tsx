import MeasurementScene from './MeasurementScene';

export default function BoneDensity1W() {
  return (
    <MeasurementScene avatar="W" title={"Bone density"} marker="1" cue="scan" unavailable
      caption={"Not measured on board"} />
  );
}
