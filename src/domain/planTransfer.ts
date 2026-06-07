import { isValidPosition } from './quran';
import {
  CadenceTemplate,
  ExplicitScheduleDay,
  Plan,
  ProgressEntry,
  ProgressStatus,
  TemplateKind,
} from './types';
import { isValidISODate } from '../utils/date';

export const PLAN_EXPORT_FORMAT = 'quran-tracker-plan';
export const PLAN_EXPORT_VERSION = 1;

const STATUSES: readonly ProgressStatus[] = ['full', 'partial', 'missed'];
const KINDS: readonly TemplateKind[] = ['computed', 'scheduled'];

/** A single progress record in an export (without storage ids). */
export interface PlanExportEntry {
  date: string;
  status: ProgressStatus;
  verses: number;
}

/** The portable shape written to / read from a plan export file. */
export interface PlanExport {
  format: typeof PLAN_EXPORT_FORMAT;
  version: number;
  exportedAt: string;
  plan: {
    name: string;
    templateId: string;
    startDate: string;
    dailyTarget: number;
    templateSnapshot: CadenceTemplate;
  };
  entries: PlanExportEntry[];
}

/** Validated, ready-to-store result of parsing an export file. */
export interface ParsedPlanImport {
  name: string;
  templateId: string;
  startDate: string;
  dailyTarget: number;
  templateSnapshot: CadenceTemplate;
  entries: PlanExportEntry[];
}

/** Serializes a plan and its progress entries to a portable JSON string. The
 *  full template snapshot is included, so a user-defined plan carries its
 *  embedded day-by-day schedule and re-imports losslessly on any device. */
export function serializePlan(plan: Plan, entries: readonly ProgressEntry[]): string {
  const payload: PlanExport = {
    format: PLAN_EXPORT_FORMAT,
    version: PLAN_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    plan: {
      name: plan.name,
      templateId: plan.templateId,
      startDate: plan.startDate,
      dailyTarget: plan.dailyTarget,
      templateSnapshot: plan.templateSnapshot,
    },
    entries: entries.map((entry) => ({
      date: entry.date,
      status: entry.status,
      verses: entry.verses,
    })),
  };
  return JSON.stringify(payload, null, 2);
}

function isPositiveInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

function fail(message: string): never {
  throw new Error(message);
}

function parseScheduleDays(raw: unknown): ExplicitScheduleDay[] | undefined {
  if (raw == null) return undefined;
  if (!Array.isArray(raw)) fail('Schedule must be a list of days.');
  return raw.map((value, index) => {
    const day = value as Partial<ExplicitScheduleDay>;
    if (!day.from || !day.to || !isValidPosition(day.from) || !isValidPosition(day.to)) {
      fail(`Schedule day ${index + 1} has an invalid position.`);
    }
    return {
      day: typeof day.day === 'number' ? day.day : index + 1,
      phase: typeof day.phase === 'number' ? day.phase : 1,
      isReview: Boolean(day.isReview),
      pages: typeof day.pages === 'number' ? day.pages : undefined,
      from: { surah: day.from!.surah, ayah: day.from!.ayah, page: day.from!.page },
      to: { surah: day.to!.surah, ayah: day.to!.ayah, page: day.to!.page },
    };
  });
}

function parseSnapshot(raw: unknown): CadenceTemplate {
  if (!raw || typeof raw !== 'object') fail('The plan is missing its template details.');
  const record = raw as Record<string, unknown>;
  if (typeof record.id !== 'string' || record.id.length === 0) fail('Invalid template id.');
  if (!KINDS.includes(record.kind as TemplateKind)) fail('Invalid template kind.');
  const names = record.names as { en?: unknown; ar?: unknown } | undefined;
  if (!names || typeof names.en !== 'string' || typeof names.ar !== 'string') {
    fail('The template is missing localized names.');
  }
  if (!isPositiveInt(record.durationDays)) fail('Invalid template duration.');
  if (!isPositiveInt(record.dailyTarget)) fail('Invalid template daily target.');
  if (!isPositiveInt(record.totalVerses)) fail('Invalid template verse total.');

  return {
    id: record.id,
    kind: record.kind as TemplateKind,
    names: { en: names.en, ar: names.ar },
    durationDays: record.durationDays,
    dailyTarget: record.dailyTarget,
    totalVerses: record.totalVerses,
    userDefined: record.userDefined === true ? true : undefined,
    source: typeof record.source === 'string' ? record.source : undefined,
    schedule: parseScheduleDays(record.schedule),
  };
}

function parseEntries(raw: unknown): PlanExportEntry[] {
  if (raw == null) return [];
  if (!Array.isArray(raw)) fail('Progress entries must be a list.');
  return raw.map((value, index) => {
    const entry = value as Record<string, unknown>;
    const where = `Entry ${index + 1}`;
    if (typeof entry.date !== 'string' || !isValidISODate(entry.date)) {
      fail(`${where} has an invalid date.`);
    }
    if (!STATUSES.includes(entry.status as ProgressStatus)) {
      fail(`${where} has an invalid status.`);
    }
    if (typeof entry.verses !== 'number' || !Number.isInteger(entry.verses) || entry.verses < 0) {
      fail(`${where} has an invalid verse count.`);
    }
    return {
      date: entry.date,
      status: entry.status as ProgressStatus,
      verses: entry.verses,
    };
  });
}

/**
 * Parses and validates a plan export file. Throws an Error with a
 * human-readable message on any problem so the import is atomic: a malformed
 * file is rejected outright rather than partially applied.
 */
export function parsePlanExport(text: string): ParsedPlanImport {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    fail('This file is not valid JSON.');
  }
  if (!raw || typeof raw !== 'object') fail('This file is not a plan export.');
  const record = raw as Record<string, unknown>;
  if (record.format !== PLAN_EXPORT_FORMAT) {
    fail('This file is not a Quran Tracker plan export.');
  }
  if (record.version !== PLAN_EXPORT_VERSION) {
    fail(`Unsupported export version: ${String(record.version)}.`);
  }

  const plan = record.plan as Record<string, unknown> | undefined;
  if (!plan || typeof plan !== 'object') fail('The export is missing its plan.');
  if (typeof plan.name !== 'string' || plan.name.trim().length === 0) fail('The plan has no name.');
  if (typeof plan.templateId !== 'string' || plan.templateId.length === 0) {
    fail('The plan has no cadence.');
  }
  if (typeof plan.startDate !== 'string' || !isValidISODate(plan.startDate)) {
    fail('The plan has an invalid start date.');
  }

  const templateSnapshot = parseSnapshot(plan.templateSnapshot);
  const dailyTarget = isPositiveInt(plan.dailyTarget) ? plan.dailyTarget : templateSnapshot.dailyTarget;

  return {
    name: plan.name.trim(),
    templateId: plan.templateId,
    startDate: plan.startDate,
    dailyTarget,
    templateSnapshot,
    entries: parseEntries(record.entries),
  };
}
