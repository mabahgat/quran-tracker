import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppState, Platform } from 'react-native';

import { useRepositories } from '@/data/RepositoryProvider';
import { progressLoggedEvent } from '@/domain/events';
import { summarizePlan } from '@/domain/planSummary';
import { versesForStatus } from '@/domain/progress';
import {
  buildWatchPayload,
  buildWatchPlanEntry,
  parseWatchLogMessage,
  WatchPayload,
} from '@/domain/watchSnapshot';
import { Plan, ProgressEntry } from '@/domain/types';
import { useApp } from '@/state/AppProvider';
import { todayISO } from '@/utils/date';
import { formatPosition } from '@/utils/format';

type WatchConnectivity = typeof import('react-native-watch-connectivity');

let cachedModule: WatchConnectivity | null = null;

/** Lazily loads the native bridge, only on iOS. Returns null elsewhere so the web
 *  and Android bundles never touch the native module. */
function getWatchConnectivity(): WatchConnectivity | null {
  if (Platform.OS !== 'ios') return null;
  if (!cachedModule) {
    cachedModule = require('react-native-watch-connectivity') as WatchConnectivity;
  }
  return cachedModule;
}

/**
 * Keeps the Apple Watch in sync with ALL of the user's plans: it pushes a compact,
 * pre-localized payload (one entry per plan) whenever the plans or their progress
 * change, and applies log actions the watch sends back to the specific plan they
 * target. Renders nothing and is a no-op on platforms other than iOS.
 */
export function WatchSync() {
  const { t } = useTranslation();
  const { plans, defaultPlan, language } = useApp();
  const repositories = useRepositories();

  const [entriesByPlan, setEntriesByPlan] = useState<Record<string, ProgressEntry[]>>({});

  const loadAll = useCallback(async () => {
    const pairs = await Promise.all(
      plans.map(async (plan) => [plan.id, await repositories.progress.listByPlan(plan.id)] as const),
    );
    setEntriesByPlan(Object.fromEntries(pairs));
  }, [plans, repositories]);

  // Reload all plans' entries when the plan set changes and whenever the app
  // returns to the foreground (covers logs made on the phone between glances).
  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') loadAll();
    });
    return () => sub.remove();
  }, [loadAll]);

  const today = todayISO();

  const projectionLabelFor = useCallback(
    (summary: ReturnType<typeof summarizePlan>) => {
      const { projection } = summary;
      if (projection.isComplete) return t('home.complete');
      if (projection.daysAheadOfTarget == null) return '';
      const days = projection.daysAheadOfTarget;
      if (days > 0) return t('home.ahead', { n: days });
      if (days < 0) return t('home.behind', { n: Math.abs(days) });
      return t('home.onTrack');
    },
    [t],
  );

  const payload = useMemo<WatchPayload>(() => {
    const entries = plans.map((plan) => {
      const planEntries = entriesByPlan[plan.id] ?? [];
      const summary = summarizePlan(plan, planEntries, today);
      return buildWatchPlanEntry({
        id: plan.id,
        isDefault: plan.id === defaultPlan?.id,
        planName: plan.name,
        dailyGoal: summary.dailyGoal,
        goalLabel: t('home.versesCount', { n: summary.dailyGoal }),
        upToLabel:
          summary.isScheduled && summary.scheduledTarget
            ? formatPosition(summary.scheduledTarget, language)
            : '',
        positionLabel: summary.projection.position
          ? formatPosition(summary.projection.position, language)
          : '',
        percent: summary.projection.percentComplete,
        todayStatus: summary.todayEntry?.status ?? '',
        statusLabel: summary.todayEntry ? t(`status.${summary.todayEntry.status}`) : '',
        projectionLabel: projectionLabelFor(summary),
        isComplete: summary.projection.isComplete,
      });
    });
    const defaultIndex = Math.max(
      0,
      plans.findIndex((plan) => plan.id === defaultPlan?.id),
    );
    return buildWatchPayload({
      language: language === 'ar' ? 'ar' : 'en',
      defaultIndex,
      plans: entries,
    });
  }, [plans, entriesByPlan, defaultPlan, language, today, t, projectionLabelFor]);

  // Push the payload to the watch when it meaningfully changes (ignore the
  // timestamp so an unchanged payload isn't re-sent on every render).
  const lastSent = useRef<string>('');
  useEffect(() => {
    const wc = getWatchConnectivity();
    if (!wc) return;
    const { updatedAt, ...stable } = payload;
    const serialized = JSON.stringify(stable);
    if (serialized === lastSent.current) return;
    lastSent.current = serialized;
    try {
      wc.updateApplicationContext(payload as unknown as Record<string, unknown>);
    } catch {
      // The watch may be unpaired/unavailable; ignore and retry on the next change.
    }
  }, [payload]);

  const applyLog = useCallback(
    async (raw: unknown) => {
      const message = parseWatchLogMessage(raw);
      if (!message) return;
      const targetId = message.planId || defaultPlan?.id;
      const plan: Plan | undefined = plans.find((p) => p.id === targetId);
      if (!plan) return;
      const planEntries =
        entriesByPlan[plan.id] ?? (await repositories.progress.listByPlan(plan.id));
      const { dailyGoal } = summarizePlan(plan, planEntries, todayISO());
      const credited = versesForStatus(message.status, dailyGoal, message.verses);
      const date = todayISO();
      await repositories.progress.upsert({ planId: plan.id, date, status: message.status, verses: credited });
      await repositories.events.add(progressLoggedEvent(plan, message.status, credited, date));
      await loadAll();
    },
    [plans, entriesByPlan, defaultPlan, repositories, loadAll],
  );

  // Apply log actions coming back from the watch. The watch uses transferUserInfo
  // for guaranteed (queued) delivery, which surfaces as the 'user-info' event;
  // 'message' is also handled in case it is delivered live while reachable.
  useEffect(() => {
    const wc = getWatchConnectivity();
    if (!wc) return;
    const subs = [
      wc.watchEvents.addListener('message', (message: unknown) => applyLog(message)),
      wc.watchEvents.addListener('user-info', (info: unknown) => applyLog(info)),
    ];
    return () => {
      subs.forEach((unsubscribe) => unsubscribe());
    };
  }, [applyLog]);

  return null;
}
