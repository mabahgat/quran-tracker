import { nextScheduledChunk, resolvePlanSchedule } from './explicitSchedule';
import { computeProjection, ProjectionResult } from './projection';
import { totalMemorized } from './progress';
import { Plan, ProgressEntry, QuranPosition } from './types';

export interface PlanSummary {
  projection: ProjectionResult;
  /** Verses credited for a "Full" day today (schedule chunk, or flat target). */
  dailyGoal: number;
  /** For scheduled plans, the position reached by completing today's portion. */
  scheduledTarget: QuranPosition | null;
  isScheduled: boolean;
  /** Today's entry, or null if nothing is logged today. */
  todayEntry: ProgressEntry | null;
}

/**
 * Pure summary of a plan's current standing for a given day. Mirrors exactly what
 * the `usePlan` hook computes (daily goal, scheduled target, projection), but as a
 * plain function so any plan can be summarized — e.g. to build the per-plan
 * snapshots the watch shows for every plan, not just the default.
 */
export function summarizePlan(
  plan: Plan,
  entries: readonly ProgressEntry[],
  today: string,
): PlanSummary {
  const schedule = resolvePlanSchedule(plan);
  // Verses done before today, so today's goal is independent of how today is
  // currently logged (matching usePlan).
  const memorizedBeforeToday = totalMemorized(entries.filter((entry) => entry.date !== today));
  const scheduledChunk = schedule ? nextScheduledChunk(schedule, memorizedBeforeToday) : null;
  const dailyGoal = schedule ? (scheduledChunk ? scheduledChunk.goalVerses : 0) : plan.dailyTarget;
  return {
    projection: computeProjection(plan, entries, today),
    dailyGoal,
    scheduledTarget: scheduledChunk?.targetTo ?? null,
    isScheduled: schedule !== null,
    todayEntry: entries.find((entry) => entry.date === today) ?? null,
  };
}
