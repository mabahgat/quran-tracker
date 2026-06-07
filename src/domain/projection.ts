import { lastLogDate, totalMemorized } from './progress';
import { lastMemorizedPosition, nextPosition, TOTAL_AYAH } from './quran';
import { getTemplate } from './templates';
import { Plan, ProgressEntry, QuranPosition } from './types';
import { addDays, daysInclusive, diffDays } from '../utils/date';

export interface ProjectionResult {
  totalMemorized: number;
  remaining: number;
  percentComplete: number;
  position: QuranPosition | null;
  nextPosition: QuranPosition | null;
  isComplete: boolean;
  ratePerDay: number | null;
  elapsedDays: number;
  loggedDays: number;
  projectedFinishDate: string | null;
  targetFinishDate: string;
  daysAheadOfTarget: number | null;
}

/**
 * Computes the current standing and a finish-date projection for a plan.
 *
 * Rate is based on actual logged effort: total verses memorized divided by the
 * number of elapsed days from the plan start through the most recent log. The
 * projected finish extends that rate from `today` over the remaining verses.
 */
export function computeProjection(
  plan: Plan,
  entries: readonly ProgressEntry[],
  today: string,
): ProjectionResult {
  const memorized = totalMemorized(entries);
  const remaining = TOTAL_AYAH - memorized;
  const isComplete = remaining <= 0;
  const percentComplete = (memorized / TOTAL_AYAH) * 100;

  // Prefer the plan's frozen template snapshot so changes to the JSON resource
  // files never retroactively move an existing plan's target date.
  const nominalDays = plan.templateSnapshot?.durationDays ?? getTemplate(plan.templateId).durationDays;
  const targetFinishDate = addDays(plan.startDate, nominalDays - 1);

  const latestLog = lastLogDate(entries);
  const loggedDays = new Set(entries.map((entry) => entry.date)).size;
  const elapsedDays = latestLog ? Math.max(1, daysInclusive(plan.startDate, latestLog)) : 0;
  const ratePerDay = memorized > 0 && elapsedDays > 0 ? memorized / elapsedDays : null;

  let projectedFinishDate: string | null = null;
  if (isComplete) {
    projectedFinishDate = latestLog ?? today;
  } else if (ratePerDay && ratePerDay > 0) {
    projectedFinishDate = addDays(today, Math.ceil(remaining / ratePerDay));
  }

  const daysAheadOfTarget = projectedFinishDate
    ? diffDays(projectedFinishDate, targetFinishDate)
    : null;

  return {
    totalMemorized: memorized,
    remaining,
    percentComplete,
    position: lastMemorizedPosition(memorized),
    nextPosition: nextPosition(memorized),
    isComplete,
    ratePerDay,
    elapsedDays,
    loggedDays,
    projectedFinishDate,
    targetFinishDate,
    daysAheadOfTarget,
  };
}
