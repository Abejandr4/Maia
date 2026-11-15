import MeasurementScene from './MeasurementScene';

export default function BloodSugarAW() {
  return (
    <MeasurementScene avatar="W" title={"Blood sugar (fasting)"} marker="A" cue="glucose"
      caption={"If it is low (54–69), eat or drink fast sugar and measure again in 15 minutes. If it is high, measure again tomorrow."} />
  );
}
