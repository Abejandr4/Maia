import MeasurementScene from './MeasurementScene';

export default function SuitPressure1W() {
  return (
    <MeasurementScene avatar="W" title={"Suit pressure"} marker="1" cue="gauge" suit suitReading="4.3 psi"
      caption={"Read from the suit"} />
  );
}
