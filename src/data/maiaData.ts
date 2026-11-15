// Maia data layer: the ONLY place the app reads the analysis results.
// The JSON files in ./generated are created by analysis/code/step9_export_for_app.py.
// Do not edit them by hand: re-run the Python and they are replaced.

import reportJson from './generated/maia_report.json'
import labRealJson from './generated/maia_lab_real.json'
import dailyJson from './generated/maia_daily.json'
import immuneJson from './generated/maia_immune.json'
import evaluationJson from './generated/maia_evaluation.json'
import targetsJson from './generated/maia_targets.json'
import sourcesJson from './generated/maia_sources.json'
import alertsJson from './generated/maia_alerts.json'
import measurementsJson from './generated/maia_measurements.json'
import pastReportsJson from './generated/maia_past_reports.json'
import routineJson from './generated/maia_routine.json'
import contextsJson from './generated/maia_contexts.json'
import bodyZonesJson from './generated/maia_body_zones.json'
import symptomsJson from './generated/maia_symptoms.json'
import spacewalkJson from './generated/maia_spacewalk.json'
import earthJson from './generated/maia_earth.json'
import placeRulesJson from './generated/maia_place_rules.json'

// ---------- types ----------
export type Side = '' | 'high' | 'low' | 'missing' | 'eva_shown'
export type RefStatus = 'green' | 'yellow' | 'red' | 'missing'

export interface DailyPoint {
  day: number
  value: number | null
  side: Side
  ref_status: RefStatus
  marked_change: '' | 'high' | 'low'
  stale: boolean
  phase: string
}
export interface Band { low: number | null; high: number | null; median: number; robust_sd: number; ready: boolean }
export interface Reference {
  green_min: number | null; green_max: number | null
  red_below: number | null; red_above: number | null; source: string
}
export interface MarkedChange {
  measurement_id: string; side: 'high' | 'low'
  first_out_day: number; detection_day: number; last_day: number
  max_n_of_6: number; max_size_robust_sd: number
  confidence: 'high' | 'medium' | 'low'
  overlapping_events: string | null; missing_in_window: boolean
}
export interface DailyData {
  person: string; location: string; is_synthetic: boolean; label: string
  learning_window_days: number[]
  bands: Record<string, Band>
  reference: Record<string, Reference>
  series: Record<string, DailyPoint[]>
  changes: MarkedChange[]
  cabin_co2: { day: number; mean: number; max_1h: number; hours_over_3: number; mean_7d: number | null; air_quality_rule: boolean }[]
  radiation_pct_of_career_limit: { day: number; value: number }[]
  events: { day: number; kind: 'event' | 'symptom'; id: string; description: string }[]
  solar_event_replay: { date: string; type: string; intensity: string; noaa_s_scale: string; proton_flux_pfu: number | null; source: string; evidence_level: string }[]
  comm_policy: string
  co2_rules: { id: string; condition_1: string; condition_2: string; result_color: string; message: string; source: string }[]
}
export interface MaiaAlert {
  day: number; alert_id: string; level: 'advisory' | 'caution' | 'warning' | 'critical'
  title: string; text: string; measurement: string; source: string
}
export interface ImmuneDay {
  day: number; cellular: string; inflammatory: string; viral: string; clinical: string
  n_domains: number; immune_review: string; context: string
}
export interface ImmuneData {
  is_synthetic: boolean; label: string; window_days: number; baseline_crew: string
  timeline: ImmuneDay[]
  inflight_labs: { day: number; test_id: string; value: number; unit: string; baseline_mean: number; pct_change: number; rcv_pct: number | null; beyond_rcv: string }[]
  saliva: { day: number; virus: string; result: string }[]
  domains: { domain: string; condition: string; window_days: number; counts_alone: string }[]
  rule_on_real_postflight: { crew_id: string; timepoint: string; cellular: string; inflammatory: string; n_domains: number; immune_review: string }[]
}
export interface LabPost { timepoint: string; value: number | null; change_pct: number | null; status: string }
export interface LabTest { unit: string; baseline: number | null; baseline_n: number; post: LabPost[] }
export interface LabRealData {
  dataset: string; is_real: boolean; caveat: string; method: string
  crew: Record<string, Record<string, LabTest>>
  data_quality: { test_id: string; timepoint: string; side: string; crew_outside: number; crew_total: number; crew_ids: string; back_in_range_next_timepoint: string; next_timepoint: string; message: string }[]
  immune_rule_on_real_data: { crew_id: string; timepoint: string; cellular: string; inflammatory: string }[]
}
export interface ReportSection { order: number; section: string; priority_rule: string; data: unknown }
export interface Report { report: string; is_synthetic: boolean; label: string; generated_for_mission_day: number; sections: ReportSection[] }
export interface EvaluationRow {
  section: string; item: string; runs: number | null
  detection_rate_pct: number | null; false_alarms_per_100_crew_days: number | null
  days_to_detection_median: number | null; days_to_detection_p10_p90: string | null
  note: string | null; source: string; evidence_level: string
}
export interface Target { goal: string; comparator: string | null; value: number; unit: string; location: string; standard_id: string | null; notes: string | null; source: string; evidence_level: string }
export interface Source { reference: string; link: string | null }

// ---------- data ----------
export const report = reportJson as unknown as Report
export const labReal = labRealJson as unknown as LabRealData
export const daily = dailyJson as unknown as DailyData
export const immune = immuneJson as unknown as ImmuneData
export const evaluation = evaluationJson as unknown as EvaluationRow[]
export const targets = targetsJson as unknown as Target[]
export const sources = sourcesJson as unknown as Record<string, Source>
export const alerts = alertsJson as unknown as MaiaAlert[]

export interface MeasurementText {
  id: string; name: string; unit: string
  why_it_matters: string | null; what_to_do_yellow: string | null; what_to_do_red: string | null; source: string
}
/** Plain-language texts from measurements.csv (why it matters, what to do). */
export interface PastReport { day: number; headline: string; n_changes: number; data_completeness_pct: number; size_kb: number }
/** Earlier weekly reports, made with the same method on an earlier report day. */
export const pastReports = pastReportsJson as unknown as PastReport[]

export interface RoutineRow { time: string; task: string; type: string; measurement_id: string | null; location: string; source: string; evidence_level: string }
/** Daily routine from daily_routine.csv (times are DEMO, sleep period cited). */
export const routine = routineJson as unknown as RoutineRow[]

export interface ContextRow {
  id: string; name: string; status: string; gravity: string; comm_delay_label: string
  delay_one_way_min_s: number | null; delay_one_way_max_s: number | null
  blackout_days_min: number | null; blackout_days_max: number | null
  daily_dose_msv_min: number | null; daily_dose_msv_max: number | null
  stricter_rules: string; description: string; comm_policy: string; source: string; evidence_level: string
}
/** Locations from contexts.csv (ISS, spacewalk, back on Earth, lunar and Mars previews). */
export const contexts = contextsJson as unknown as ContextRow[]

export interface BodyZoneRow {
  id: string; name: string; pos_x: number; pos_y: number
  what_it_does: string; what_space_does: string; what_affects_it_on_earth: string
  measurements: string | null; how_to_care: string; eva_focus: string; nasa_risks: string; symptoms: string
  source: string; evidence_level: string
}
/** The 10 body zones of body_zones.csv (single source for the body map). */
export const bodyZones = bodyZonesJson as unknown as BodyZoneRow[]

export interface SymptomRow { id: string; zone: string; name: string; severity_scale: string; environment_link: string | null; notes: string | null; source: string; evidence_level: string }
/** Symptom list of symptoms.csv (id, zone, name). */
export const symptomList = symptomsJson as unknown as SymptomRow[]

export const measurementTexts = measurementsJson as unknown as Record<string, MeasurementText>

/** "Today" of the demo = the day the report was generated for (42, same as the app's mission clock). */
export const REPORT_DAY: number = report.generated_for_mission_day

/** Values that exist on or before the report day. */
export const upTo = <T extends { day: number }>(rows: T[], day = REPORT_DAY): T[] => rows.filter((r) => r.day <= day)

// ---------- helpers ----------
/** Size of the report that would be sent with the next downlink. */
export function reportSizeKb(): number {
  const send = report.sections.find((s) => s.section === 'Send')?.data as { size_kb?: number } | undefined
  return send?.size_kb ?? 0
}

/** One section of the report by its name in report_template ("Header", "Ordered changes", ...). */
export function reportSection<T = unknown>(name: string): T | undefined {
  return report.sections.find((s) => s.section === name)?.data as T | undefined
}

/** Daily series of one measurement up to a given mission day (for the 7-day evidence chart use last 7). */
export function series(measurement: string, untilDay = 60, lastN?: number): DailyPoint[] {
  const s = (daily.series[measurement] ?? []).filter((p) => p.day <= untilDay)
  return lastN ? s.slice(-lastN) : s
}

/** Immune state on one mission day. */
export function immuneOnDay(day: number): ImmuneDay | undefined {
  return immune.timeline.find((d) => d.day === day)
}

/** "S78; S79" -> [{id, reference, link}] so every alert can link to its evidence. */
export function sourceLinks(ids: string): { id: string; reference: string; link: string | null }[] {
  return ids
    .split(/[;,]/)
    .map((x) => x.trim().split(' ')[0])
    .filter((id) => id in sources)
    .map((id) => ({ id, ...sources[id] }))
}

/** Label every number that is not REAL, as the guide requires. */
export const SAMPLE_LABEL = 'sample'

/* ---------- spacewalk and back on Earth (step4b, synthetic_data rows "tomas" and "iris") ---------- */
export interface LimitRow {
  measurement_id: string
  ref_green_min: number | null; ref_green_max: number | null
  ref_red_below: number | null; ref_red_above: number | null
  notes: string | null; source: string
}
export interface PlaceText { description: string; comm_policy: string; source: string }
export interface EvaSample {
  minute: number; suit_pressure: number; suit_co2: number; heart_rate: number
  eva_time_remaining: number; event: string; is_synthetic: string; source: string
}
export interface EarthDay {
  day_after_landing: number; orthostatic_sys_drop: number; heart_rate: number; sleep: number
  symptom: string; is_synthetic: string; source: string
}
/** EVA day of "tomas (sample)": one sample every 2 min for 6.5 h. All synthetic. */
export const spacewalk = spacewalkJson as unknown as {
  samples: EvaSample[]; limits: LimitRow[]; context: PlaceText; person: string; interval_min: number; duration_min: number
}
/** Days 1–14 after landing of "iris (sample)". All synthetic. */
export const earth = earthJson as unknown as { days: EarthDay[]; limits: LimitRow[]; context: PlaceText; person: string }

export type Level = 'green' | 'yellow' | 'red' | 'none'
/** Colour of a value against a measurement_ranges row (green / yellow / red). */
export function levelOf(limits: LimitRow[], id: string, value: number): Level {
  const r = limits.find((l) => l.measurement_id === id)
  if (!r || !Number.isFinite(value)) return 'none'
  if ((r.ref_red_below != null && value < r.ref_red_below) || (r.ref_red_above != null && value > r.ref_red_above)) return 'red'
  if ((r.ref_green_min != null && value < r.ref_green_min) || (r.ref_green_max != null && value > r.ref_green_max)) return 'yellow'
  if (r.ref_green_min == null && r.ref_green_max == null) return 'none'
  return 'green'
}
/** Green range in words, e.g. "4.2–4.4", "≤ 3", "≥ 60". */
export function greenText(limits: LimitRow[], id: string): string {
  const r = limits.find((l) => l.measurement_id === id)
  if (!r) return ''
  const { ref_green_min: a, ref_green_max: b } = r
  if (a != null && b != null) return `${a}–${b}`
  if (b != null) return `≤ ${b}`
  if (a != null) return `≥ ${a}`
  return ''
}

/* ---------- who gets each alert, and combined rules (alert_recipients.csv, combined_rules.csv) ---------- */
export interface RecipientRow { edition_or_location: string; level: string; recipient_role: string; channel: string; order: number; includes: string | null; notes: string | null; source: string }
export interface CombinedRule { id: string; condition_1: string; condition_2: string | null; condition_3: string | null; result_color: string; message: string; locations: string; source: string; evidence_level: string }
export const placeRules = placeRulesJson as unknown as { alert_recipients: RecipientRow[]; combined_rules: CombinedRule[] }
