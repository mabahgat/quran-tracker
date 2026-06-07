import { resolvePlanSchedule, scheduleDaysElapsed } from './explicitSchedule';
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
 * For computed (flat-target) plans the projected finish extends the user's
 * average verse rate over the remaining verses. For scheduled plans the rate is
 * measured in *schedule days completed per calendar day* instead: an incremental
 * plan front-loads small daily portions, so a verse-based rate would wrongly
 * read a user who is keeping up as hundreds of days behind. Measuring how far
 * through the schedule they are keeps "keeping up" on-track.
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

  const schedule = resolvePlanSchedule(plan);

  let projectedFinishDate: string | null = null;
  if (isComplete) {
    projectedFinishDate = latestLog ?? today;
  } else if (schedule) {
    // Schedule-aware: extrapolate the user's pace *through the schedule*.
    const elapsedScheduleDays = scheduleDaysElapsed(schedule, memorized);
    const schedulePace = elapsedScheduleDays > 0 && elapsedDays > 0 ? elapsedScheduleDays / elapsedDays : null;
    if (schedulePace && schedulePace > 0) {
      const remainingScheduleDays = Math.max(0, schedule.days.length - elapsedScheduleDays);
      projectedFinishDate = addDays(today, Math.ceil(remainingScheduleDays / schedulePace));
    }
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
