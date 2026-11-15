import MeasurementScene from './MeasurementScene';

export default function SuitCO21M() {
  return (
    <MeasurementScene avatar="M" title={"Suit CO₂"} marker="1" cue="gauge" suit suitReading="2.5 mmHg"
      caption={"Read from the suit"} />
  );
}
