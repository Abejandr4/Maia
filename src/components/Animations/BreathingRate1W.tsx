import MeasurementScene from './MeasurementScene';

export default function BreathingRate1W() {
  return (
    <MeasurementScene avatar="W" title={"Breathing rate"} marker="1" cue="timer"
      caption={"A crewmate counts how many times your chest rises in 30 seconds, twice, and doubles it"} />
  );
}
