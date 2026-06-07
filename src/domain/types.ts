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

export type TemplateId =
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

