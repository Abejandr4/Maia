import MeasurementScene from './MeasurementScene';

export default function AerobicFitness1M() {
  return (
    <MeasurementScene avatar="M" title={"Aerobic fitness (VO₂max)"} marker="1" cue="bike" unavailable
      caption={"Not measured on board in this app"} />
  );
}
