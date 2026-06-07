import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';

import { useRepositories } from '@/data/RepositoryProvider';
import { progressDeletedEvent, progressLoggedEvent } from '@/domain/events';
import { getExplicitSchedule, nextScheduledChunk } from '@/domain/explicitSchedule';
import { computeProjection, ProjectionResult } from '@/domain/projection';
import { totalMemorized, versesForStatus } from '@/domain/progress';
import { Plan, ProgressEntry, ProgressStatus, QuranPosition } from '@/domain/types';
import { todayISO } from '@/utils/date';

export interface UsePlanResult {
  plan: Plan | null;
  entries: ProgressEntry[];
  projection: ProjectionResult | null;
  todayEntry: ProgressEntry | null;
  /** Verses credited for a "Full" day today (the schedule's amount for scheduled
   *  templates, otherwise the flat daily target). */
  dailyGoal: number;
  /** True when this plan follows an explicit expert schedule. */
  isScheduled: boolean;
  /** For scheduled plans, the position reached by completing today's portion. */
  scheduledTarget: QuranPosition | null;
  loading: boolean;
  reload: () => Promise<void>;
  log: (status: ProgressStatus, verses?: number, date?: string) => Promise<void>;
  /** Correct a previously logged entry, recomputing the credited verses for its
   *  own date (so a "Full" correction uses the right goal for that day). */
  editEntry: (entryId: string, status: ProgressStatus, verses?: number) => Promise<void>;
  /** Remove a previously logged entry (e.g. one added by mistake). */
  deleteEntry: (entryId: string) => Promise<void>;
}

export function usePlan(planId: string | null | undefined): UsePlanResult {
  const repositories = useRepositories();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [entries, setEntries] = useState<ProgressEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!planId) {
      setPlan(null);
      setEntries([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [loadedPlan, loadedEntries] = await Promise.all([
      repositories.plans.get(planId),
      repositories.progress.listByPlan(planId),
    ]);
    setPlan(loadedPlan);
    setEntries(loadedEntries);
    setLoading(false);
  }, [repositories, planId]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const today = todayISO();

  const schedule = useMemo(
    () => (plan ? getExplicitSchedule(plan.templateId) : null),
    [plan],
  );

  // Verses memorized before today, so today's goal/credit is independent of how
  // today is currently logged (lets the user freely switch Full/Partial/Missed).
  const memorizedBeforeToday = useMemo(
    () => totalMemorized(entries.filter((entry) => entry.date !== today)),
    [entries, today],
  );

  const scheduledChunk = useMemo(
    () => (schedule ? nextScheduledChunk(schedule, memorizedBeforeToday) : null),
    [schedule, memorizedBeforeToday],
  );

  const dailyGoal = useMemo(() => {
    if (!plan) return 0;
    if (schedule) return scheduledChunk ? scheduledChunk.goalVerses : 0;
    return plan.dailyTarget;
  }, [plan, schedule, scheduledChunk]);

  const log = useCallback(
    async (status: ProgressStatus, verses = 0, date: string = todayISO()) => {
      if (!plan) return;
      const credited = versesForStatus(status, dailyGoal, verses);
      await repositories.progress.upsert({ planId: plan.id, date, status, verses: credited });
      await repositories.events.add(progressLoggedEvent(plan, status, credited, date));
      await reload();
    },
    [repositories, plan, reload, dailyGoal],
  );

  const editEntry = useCallback(
    async (entryId: string, status: ProgressStatus, verses = 0) => {
      if (!plan) return;
      const entry = entries.find((item) => item.id === entryId);
      if (!entry) return;
      // The "Full" goal for a past day is the schedule chunk that begins at the
      // progress reached before that date (or the flat target for computed plans),
      // so corrections credit the same amount the day would have credited live.
      const memorizedBefore = totalMemorized(entries.filter((item) => item.date < entry.date));
      const goal = schedule
        ? nextScheduledChunk(schedule, memorizedBefore)?.goalVerses ?? 0
        : plan.dailyTarget;
      const credited = versesForStatus(status, goal, verses);
      await repositories.progress.upsert({ planId: plan.id, date: entry.date, status, verses: credited });
      await repositories.events.add(progressLoggedEvent(plan, status, credited, entry.date));
      await reload();
    },
    [repositories, plan, entries, schedule, reload],
  );

  const deleteEntry = useCallback(
    async (entryId: string) => {
      if (!plan) return;
      const entry = entries.find((item) => item.id === entryId);
      await repositories.progress.remove(entryId);
      if (entry) {
        await repositories.events.add(progressDeletedEvent(plan, entry.date));
      }
      await reload();
    },
    [repositories, plan, entries, reload],
  );

  const todayEntry = useMemo(
    () => entries.find((entry) => entry.date === today) ?? null,
    [entries, today],
  );
  const projection = useMemo(
    () => (plan ? computeProjection(plan, entries, today) : null),
    [plan, entries, today],
  );

  return {
    plan,
    entries,
    projection,
    todayEntry,
    dailyGoal,
    isScheduled: schedule !== null,
    scheduledTarget: scheduledChunk?.targetTo ?? null,
    loading,
    reload,
    log,
    editEntry,
    deleteEntry,
  };
}
