import MeasurementScene from './MeasurementScene';

export default function Sleep1W() {
  return (
    <MeasurementScene avatar="W" title={"Sleep"} marker="1" cue="sleep"
      caption={"Write how many hours you slept, or use the sleep tracker"} />
  );
}
