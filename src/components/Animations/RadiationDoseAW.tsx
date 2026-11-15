import MeasurementScene from './MeasurementScene';

export default function RadiationDoseAW() {
  return (
    <MeasurementScene avatar="W" title={"Radiation dose"} marker="A" cue="shield"
      caption={"Keep exposure as low as you can: limit time in less shielded areas."} />
  );
}
