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
