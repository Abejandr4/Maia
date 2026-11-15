import MeasurementScene from './MeasurementScene';

export default function RadiationDoseAM() {
  return (
    <MeasurementScene avatar="M" title={"Radiation dose"} marker="A" cue="shield"
      caption={"Keep exposure as low as you can: limit time in less shielded areas."} />
  );
}
