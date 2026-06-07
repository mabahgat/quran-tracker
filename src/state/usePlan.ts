import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';

import { useRepositories } from '@/data/RepositoryProvider';
import { progressLoggedEvent } from '@/domain/events';
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
  };
}
