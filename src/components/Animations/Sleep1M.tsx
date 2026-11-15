import MeasurementScene from './MeasurementScene';

export default function Sleep1M() {
  return (
    <MeasurementScene avatar="M" title={"Sleep"} marker="1" cue="sleep"
      caption={"Write how many hours you slept, or use the sleep tracker"} />
  );
}
