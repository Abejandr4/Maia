import MeasurementScene from './MeasurementScene';

export default function BoneDensity1M() {
  return (
    <MeasurementScene avatar="M" title={"Bone density"} marker="1" cue="scan" unavailable
      caption={"Not measured on board"} />
  );
}
