import scheduleIncremental100Days from '../resources/schedules/incremental-100-days.json';
import scheduleIncremental6Months from '../resources/schedules/incremental-6-months.json';
import scheduleIncremental1Year from '../resources/schedules/incremental-1-year.json';
import { cumulativeIndexOf, isValidPosition } from './quran';
import {
  ExplicitSchedule,
  ExplicitScheduleDay,
  QuranPosition,
  SchedulePoint,
  TemplateId,
} from './types';

export type { ExplicitSchedule, ExplicitScheduleDay, SchedulePoint } from './types';

const SCHEDULED_TEMPLATE_IDS: readonly TemplateId[] = [
  'incremental-100-days',
  'incremental-6-months',
  'incremental-1-year',
];

function validatePoint(point: SchedulePoint, context: string): SchedulePoint {
  if (!isValidPosition({ surah: point.surah, ayah: point.ayah })) {
    throw new Error(`Explicit schedule ${context} has an invalid position`);
  }
  return point;
}

/**
 * Validates and normalizes an explicit, expert-authored day-by-day schedule
 * (loaded from src/resources/schedules). Throws on malformed data so a broken
 * resource fails fast at startup instead of rendering a corrupt timetable. Both
 * memorization and review days carry a from/to range.
 */
function parseSchedule(raw: unknown): ExplicitSchedule {
  const record = raw as Partial<ExplicitSchedule>;
  if (!record.templateId || !SCHEDULED_TEMPLATE_IDS.includes(record.templateId)) {
    throw new Error(`Unsupported explicit schedule templateId: ${String(record.templateId)}`);
  }
  if (!Array.isArray(record.days) || record.days.length === 0) {
    throw new Error('Explicit schedule has no days');
  }
  const days = record.days.map((day, index) => {
    const expectedDay = index + 1;
    if (day.day !== expectedDay) {
      throw new Error(`Explicit schedule day ${expectedDay} is out of order`);
    }
    if (!day.from || !day.to) {
      throw new Error(`Explicit schedule day ${day.day} is missing a position`);
    }
    return {
      ...day,
      from: validatePoint(day.from, `day ${day.day} from`),
      to: validatePoint(day.to, `day ${day.day} to`),
    };
  });

  return {
    templateId: record.templateId,
    source: record.source ?? 'unknown',
    totalDays: days.length,
    totalPages: record.totalPages ?? days[days.length - 1].to.page,
    days,
  };
}

const EXPLICIT_SCHEDULES: Partial<Record<TemplateId, ExplicitSchedule>> = {
  'incremental-100-days': parseSchedule(scheduleIncremental100Days),
  'incremental-6-months': parseSchedule(scheduleIncremental6Months),
  'incremental-1-year': parseSchedule(scheduleIncremental1Year),
};

/** Returns the expert day-by-day timetable for a template, or null if the
 *  template uses the computed (flat) schedule. */
export function getExplicitSchedule(templateId: TemplateId): ExplicitSchedule | null {
  return EXPLICIT_SCHEDULES[templateId] ?? null;
}

/**
 * Assembles an ExplicitSchedule from a list of days (e.g. an imported user
 * schedule or a plan's embedded snapshot). Days are reindexed 1..n and the total
 * page count is derived from the last day that carries page information.
 */
export function buildExplicitSchedule(
  templateId: TemplateId,
  source: string,
  days: ExplicitScheduleDay[],
): ExplicitSchedule {
  const normalized = days.map((day, index) => ({ ...day, day: index + 1 }));
  const lastWithPage = [...normalized].reverse().find((day) => day.to.page != null);
  return {
    templateId,
    source,
    totalDays: normalized.length,
    totalPages: lastWithPage?.to.page,
    days: normalized,
  };
}

export interface ScheduledChunk {
  /** The memorization day whose portion is currently being worked on. */
  scheduleDay: ExplicitScheduleDay;
  /** Verses needed to complete that portion from the current progress. */
  goalVerses: number;
  /** The position reached once that portion is complete. */
  targetTo: QuranPosition;
}

/**
 * The next portion to memorize in an explicit schedule, given how many verses
 * are already memorized. Position-based (not calendar-based): it always returns
 * the next incomplete memorization chunk, so missed days never create gaps and
 * completing it lands exactly on a schedule boundary. Review days carry no new
 * verses and are skipped. Returns null once the whole Quran is memorized.
 */
export function nextScheduledChunk(
  schedule: ExplicitSchedule,
  versesMemorized: number,
): ScheduledChunk | null {
  const done = Math.max(0, versesMemorized);
  for (const day of schedule.days) {
    if (day.isReview) {
      continue;
    }
    const end = cumulativeIndexOf(day.to);
    if (end > done) {
      return {
        scheduleDay: day,
        goalVerses: end - done,
        targetTo: { surah: day.to.surah, ayah: day.to.ayah },
      };
    }
  }
  return null;
}
