import type { VitalEvaluation } from '../../utils/types';

export type GuideIcon = 'breath' | 'heart' | 'shield' | 'drop' | 'brain' | 'help' | 'dot';
export type GuidePriority = 'critical' | 'urgent' | 'minor';

export interface EmergencyGuide {
  id: string;
  title: string;
  subtitle: string;
  icon: GuideIcon;
  priority: GuidePriority;
  /** Shown as one of the six big cards. */
  primary?: boolean;
  doNow: string[];
  watch: string[];
  ifWorse: string[];
  kit: string[];
  /** Source ids from data/emergency_cards.csv, or 'demo' where no card exists yet. */
  source: string;
}

/**
 * Steps come from data/emergency_cards.csv where a card exists.
 * Guides marked source: 'demo' are placeholders — validate them against the
 * ISS medical checklist / your sources before presenting them as guidance.
 */
export const GUIDES: EmergencyGuide[] = [
  {
    id: 'breathing',
    title: "Can't breathe well",
    subtitle: 'SpO₂ below 92 % or breathless at rest',
    icon: 'breath',
    priority: 'critical',
    primary: true,
    doNow: [
      'Sit up / restrain upright and breathe slowly',
      'Re-check SpO₂ with a warm, still finger',
      'Check cabin CO₂ and alarms',
      'Tell the crew medical officer',
    ],
    watch: ['SpO₂ target ≥94%', 'Breathing 12–20/min', 'Cabin CO₂ <3 mmHg'],
    ifWorse: [
      'SpO₂ <90% or worsening: oxygen per medical procedure and crew medical officer now',
      'Smoke or smell: toxic exposure procedure',
    ],
    kit: ['Pulse oximeter', 'Oxygen mask'],
    source: 'S32; S05',
  },
  {
    id: 'chest_pain',
    title: 'Chest pain',
    subtitle: 'Pressure, tightness or pain in the chest',
    icon: 'heart',
    priority: 'critical',
    primary: true,
    doNow: ['Stop activity and rest', 'Re-measure blood pressure after 5 min', 'Tell the crew medical officer'],
    watch: ['Systolic <180 and diastolic <120 mmHg', 'Pulse 60–100 bpm', 'SpO₂ ≥94%'],
    ifWorse: [
      'Chest pain, breathlessness, weakness, vision change or trouble speaking: crew medical officer now',
      'Unresponsive: cardiac arrest procedure',
    ],
    kit: ['BP cuff', 'ECG'],
    source: 'S27; S28',
  },
  {
    id: 'allergic_reaction',
    title: 'Allergic reaction',
    subtitle: 'Rash, swelling or tight throat after exposure',
    icon: 'shield',
    priority: 'critical',
    primary: true,
    doNow: [
      "Use the epinephrine device in the kit: outer thigh, hold for the brand's time",
      'Lie flat, legs up; sit up if breathing is hard',
      'Tell the crew medical officer',
    ],
    watch: ['SpO₂ target ≥94%', 'Pulse 60–100 bpm', 'Breathing 12–20/min', 'Re-check every 5 min'],
    ifWorse: [
      'Not better or worse after 5 min: second device only as the plan or crew medical officer says',
      'Not breathing: cardiac arrest procedure',
    ],
    kit: ['Epinephrine device', 'Pulse oximeter', 'BP cuff'],
    source: 'S22; S23; S24; S25; S26; S32',
  },
  {
    id: 'bleeding_burn',
    title: 'Bleeding / burn',
    subtitle: 'Open wound or thermal injury',
    icon: 'drop',
    priority: 'urgent',
    primary: true,
    doNow: [
      'Bleeding: firm, steady pressure with a dressing; contain floating droplets',
      'Burn: remove heat source; cool with water-soaked dressing',
      'Tell the crew medical officer',
    ],
    watch: ['Bleeding soaks through the dressing', 'Pulse 60–100 bpm', 'Size and colour of the burn'],
    ifWorse: ['Bleeding will not stop, or faint / pale / cold: crew medical officer now'],
    kit: ['Dressings', 'Gloves', 'Burn dressing'],
    source: 'demo',
  },
  {
    id: 'head_fainting',
    title: 'Head injury / fainting',
    subtitle: 'Impact, confusion or loss of consciousness',
    icon: 'brain',
    priority: 'critical',
    primary: true,
    doNow: [
      'Restrain the person and keep the head and neck still',
      'Check they respond and are breathing',
      'Tell the crew medical officer',
    ],
    watch: ['Responds to voice', 'Pupils equal', 'Pulse and SpO₂ every 5 min'],
    ifWorse: ['Not responding, vomiting, seizure or worsening confusion: crew medical officer now'],
    kit: ['Pulse oximeter', 'BP cuff', 'Penlight'],
    source: 'demo',
  },
  {
    id: 'other',
    title: 'Other',
    subtitle: 'Something not listed — start with the basics',
    icon: 'help',
    priority: 'urgent',
    primary: true,
    doNow: [
      'Stop the task and make the area safe',
      'Check breathing, pulse and responsiveness',
      'Describe what you see in the notes below',
      'Tell the crew medical officer',
    ],
    watch: ['Pulse 60–100 bpm', 'SpO₂ ≥94%', 'Temperature'],
    ifWorse: ['Any worsening: crew medical officer now'],
    kit: ['Pulse oximeter', 'BP cuff', 'Thermometer'],
    source: 'demo',
  },
  {
    id: 'low_bp',
    title: 'Low blood pressure',
    subtitle: 'Dizzy, light-headed, pale',
    icon: 'dot',
    priority: 'urgent',
    doNow: ['Sit or lie down now', 'Do not move around alone', 'Drink water'],
    watch: ['Standing drop <20/10 mmHg', 'Pulse 60–100 bpm'],
    ifWorse: ['Fainted, hit the head, or still dizzy lying down: medical support now'],
    kit: ['BP cuff'],
    source: 'S50; S65; S48',
  },
  {
    id: 'dehydration',
    title: 'Dehydration',
    subtitle: 'Strong thirst, dark urine, cramps',
    icon: 'dot',
    priority: 'minor',
    doNow: ['Stop exercise', 'Drink water slowly', 'Re-measure pulse and temperature in 15 min'],
    watch: ['Urine colour 1–3', 'Pulse 60–100 bpm'],
    ifWorse: ['Confusion or fainting: crew medical officer now'],
    kit: ['Water'],
    source: 'S21; S43',
  },
  { id: 'nausea', title: 'Nausea', subtitle: 'Sick stomach or vomiting', icon: 'dot', priority: 'minor', doNow: ['Keep a bag ready', 'Stay still, fix your eyes on one point', 'Sip water'], watch: ['Vomiting more than twice', 'Signs of dehydration'], ifWorse: ['Vomiting with headache, confusion or after radiation exposure: crew medical officer'], kit: ['Emesis bags', 'Water'], source: 'demo' },
  {
    id: 'fever',
    title: 'Fever',
    subtitle: 'Hot, chills, temperature ≥ 38 °C',
    icon: 'dot',
    priority: 'urgent',
    doNow: ['Stop exercise and cool down', 'Drink water', 'Re-measure temperature in 15 min'],
    watch: ['Temperature below 38.0 °C', 'Pulse 60–100 bpm'],
    ifWorse: ['Temperature ≥39.0 °C, confusion or fainting: crew medical officer now'],
    kit: ['Water', 'Thermometer'],
    source: 'S21; S43',
  },
  { id: 'eye', title: 'Eye irritation', subtitle: 'Something in the eye, burning, blur', icon: 'dot', priority: 'minor', doNow: ['Do not rub', 'Rinse with the eye wash', 'Check vision with the chart'], watch: ['Vision change', 'Pain level'], ifWorse: ['New blur or loss of part of vision: crew medical officer now'], kit: ['Eye wash', 'Vision chart'], source: 'demo' },
  { id: 'dental', title: 'Dental pain', subtitle: 'Toothache, broken tooth or filling', icon: 'dot', priority: 'minor', doNow: ['Rinse with water', 'Use the dental kit temporary filling if trained', 'Log pain level'], watch: ['Swelling of the face', 'Fever'], ifWorse: ['Facial swelling or fever: crew medical officer'], kit: ['Dental kit'], source: 'demo' },
  { id: 'sprain', title: 'Sprain', subtitle: 'Twisted joint, swelling', icon: 'dot', priority: 'minor', doNow: ['Stop using the joint', 'Cold pack and compression', 'Note when and how it happened'], watch: ['Swelling', 'Can move fingers/toes', 'Numbness'], ifWorse: ['Deformity, numbness or severe pain: crew medical officer'], kit: ['Cold pack', 'Elastic bandage', 'Splint'], source: 'demo' },
  { id: 'rash', title: 'Skin rash', subtitle: 'Red, itchy or irritated skin', icon: 'dot', priority: 'minor', doNow: ['Wash the area with clean water', 'Photograph it (add a photo below)', 'Avoid scratching'], watch: ['Spreading', 'Swelling of lips or throat'], ifWorse: ['Swelling of face or trouble breathing: allergic reaction guide'], kit: ['Skin cleanser', 'Topical cream'], source: 'demo' },
  { id: 'shock', title: 'Electrical shock', subtitle: 'Contact with live power', icon: 'dot', priority: 'critical', doNow: ['Cut the power before touching the person', 'Check breathing and pulse', 'Tell the crew medical officer'], watch: ['Heart rhythm (ECG)', 'Burns at entry/exit points'], ifWorse: ['Unresponsive or irregular pulse: cardiac arrest procedure / crew medical officer now'], kit: ['ECG', 'Burn dressing'], source: 'demo' },
];

/** Picks a guide to highlight from the live sensor feed (the red card). */
export function suggestedGuide(evaluations: VitalEvaluation[]): string | null {
  const bad = (k: VitalEvaluation['key']) => {
    const e = evaluations.find((x) => x.key === k);
    return e && (e.status === 'warning' || e.status === 'critical');
  };
  if (bad('spo2')) return 'breathing';
  if (bad('bp') || bad('hr')) return 'chest_pain';
  if (bad('temp')) return 'fever';
  return null;
}
