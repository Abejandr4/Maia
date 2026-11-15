import MeasurementScene from './MeasurementScene';

export default function TimeRemaining1M() {
  return (
    <MeasurementScene avatar="M" title={"Time remaining"} marker="1" cue="timer" suit suitReading="42 min"
      caption={"Read from the suit"} />
  );
}
