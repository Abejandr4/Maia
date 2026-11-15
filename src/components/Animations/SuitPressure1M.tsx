import MeasurementScene from './MeasurementScene';

export default function SuitPressure1M() {
  return (
    <MeasurementScene avatar="M" title={"Suit pressure"} marker="1" cue="gauge" suit suitReading="4.3 psi"
      caption={"Read from the suit"} />
  );
}
