import MeasurementScene from './MeasurementScene';

export default function SuitTemperature1M() {
  return (
    <MeasurementScene avatar="M" title={"Suit temperature"} marker="1" cue="thermometer" suit suitReading="22 °C"
      caption={"Read from the suit"} />
  );
}
