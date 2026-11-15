import MeasurementScene from './MeasurementScene';

export default function RadiationDose1M() {
  return (
    <MeasurementScene avatar="M" title={"Radiation dose"} marker="1" cue="shield"
      caption={"Wear your dosimeter at all times, also during spacewalks"} />
  );
}
