import MeasurementScene from './MeasurementScene';

export default function CabinCO2AM() {
  return (
    <MeasurementScene avatar="M" title={"Cabin CO₂"} marker="A" cue="air"
      caption={"Move to a better ventilated area and report it."} />
  );
}
