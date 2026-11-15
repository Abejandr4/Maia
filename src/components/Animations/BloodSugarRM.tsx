import MeasurementScene from './MeasurementScene';

export default function BloodSugarRM() {
  return (
    <MeasurementScene avatar="M" title={"Blood sugar (fasting)"} marker="R" cue="medical"
      caption={"If it is under 54, take fast sugar now and tell a crewmate. If it is high, Spica alerts your medical team."} />
  );
}
