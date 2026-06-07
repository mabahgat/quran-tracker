export interface Surah {
  number: number;
  nameAr: string;
  nameEn: string;
  meaningEn: string;
  ayahCount: number;
}

export interface QuranPosition {
  surah: number;
  ayah: number;
}

export type ProgressStatus = 'full' | 'partial' | 'missed';

export type BuiltInTemplateId =
  | '10-days'
  | '1-month'
  | '2-months'
  | '3-months'
  | '100-days'
  | 'incremental-100-days'
  | '6-months'
  | 'incremental-6-months'
  | '1-year'
  | 'incremental-1-year'
  | '2-years';

/**
 * Identifies a cadence template. Built-in templates use the known literal ids
 * (which keep autocomplete); user-defined schedules use a generated id, so any
 * string is also accepted.
 */
export type TemplateId = BuiltInTemplateId | (string & {});

/** A single point in an explicit day-by-day schedule. `page` is optional because
 *  user-imported schedules may not carry mushaf page numbers. */
export interface SchedulePoint {
  surah: number;
  ayah: number;
  page?: number;
}

/** One day of an explicit, day-by-day timetable. */
export interface ExplicitScheduleDay {
  day: number;
  phase: number;
  isReview: boolean;
  pages?: number;
  from: SchedulePoint;
  to: SchedulePoint;
}

/** An explicit, fully-enumerated timetable (expert resource or user-imported). */
export interface ExplicitSchedule {
  templateId: TemplateId;
  source: string;
  totalDays: number;
  totalPages?: number;
  days: ExplicitScheduleDay[];
}

export interface TemplateNames {
  en: string;
  ar: string;
}

/**
 * How a template's day-by-day schedule is produced:
 * - 'computed': a flat daily verse target divided evenly from the start date.
 * - 'scheduled': an explicit, expert-authored timetable loaded from a resource
 *   file (see src/resources/schedules and domain/explicitSchedule.ts).
 */
export type TemplateKind = 'computed' | 'scheduled';

/**
 * A cadence template as defined in the JSON resource files
 * (src/resources/templates). `dailyTarget` is the verses-per-day goal and
 * `durationDays` is the nominal time to finish the whole Quran.
 */
export interface CadenceTemplate {
  id: TemplateId;
  kind: TemplateKind;
  names: TemplateNames;
  durationDays: number;
  dailyTarget: number;
  totalVerses: number;
  /** True for schedules the user imported (not shipped resource files). */
  userDefined?: boolean;
  /** Provenance label (e.g. the imported file name) for user-defined schedules. */
  source?: string;
  /** Embedded day-by-day timetable for scheduled templates. Snapshotted onto a
   *  plan so the plan keeps working even if a user-defined schedule is deleted. */
  schedule?: ExplicitScheduleDay[];
}

/**
 * A schedule the user imported from CSV and saved on the device. It is converted
 * to a CadenceTemplate (for the picker) and an ExplicitSchedule (for the daily
 * goal and the schedule view) on demand.
 */
export interface UserSchedule {
  id: TemplateId;
  name: string;
  source: string;
  days: ExplicitScheduleDay[];
  createdAt: string;
}

export interface Plan {
  id: string;
  name: string;
  templateId: TemplateId;
  startDate: string;
  dailyTarget: number;
  /**
   * Snapshot of the template at the time it was applied to this plan. Stored so
   * that edits to the JSON resource files never retroactively change the cadence,
   * projection, or schedule of plans the user already created.
   */
  templateSnapshot: CadenceTemplate;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProgressEntry {
  id: string;
  planId: string;
  date: string;
  status: ProgressStatus;
  verses: number;
  createdAt: string;
  updatedAt: string;
}

export type EventType =
  | 'plan_created'
  | 'plan_renamed'
  | 'plan_template_changed'
  | 'plan_set_default'
  | 'plan_deleted'
  | 'progress_logged'
  | 'progress_deleted';

/** Type-specific payload for an event, stored as JSON. Values are kept primitive
 *  so the log stays portable and human-readable. */
export type EventDetails = Record<string, string | number>;

/**
 * A single entry in the user's activity log. `planName` is snapshotted so the log
 * stays readable even after a plan is deleted (events are never cascade-removed).
 */
export interface AppEvent {
  id: string;
  type: EventType;
  planId: string | null;
  planName: string;
  details: EventDetails;
  createdAt: string;
}

