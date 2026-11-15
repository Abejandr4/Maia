import MeasurementScene from './MeasurementScene';

export default function SuitTemperature1W() {
  return (
    <MeasurementScene avatar="W" title={"Suit temperature"} marker="1" cue="thermometer" suit suitReading="22 °C"
      caption={"Read from the suit"} />
  );
}
