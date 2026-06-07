import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform } from 'react-native';

import { buildWatchSnapshot, parseWatchLogMessage, WatchSnapshot } from '@/domain/watchSnapshot';
import { useApp } from '@/state/AppProvider';
import { usePlan } from '@/state/usePlan';
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
 * Keeps the Apple Watch in sync with the default plan: it pushes a compact,
 * pre-localized snapshot to the watch whenever the plan or today's progress
 * changes, and applies log actions the watch sends back. Renders nothing and is
 * a no-op on platforms other than iOS.
 */
export function WatchSync() {
  const { t } = useTranslation();
  const { defaultPlan, language } = useApp();
  const { plan, projection, todayEntry, dailyGoal, isScheduled, scheduledTarget, log } = usePlan(
    defaultPlan?.id,
  );

  const snapshot = useMemo<WatchSnapshot>(() => {
    if (!plan || !projection) {
      return buildWatchSnapshot({ hasPlan: false });
    }

    let projectionLabel = '';
    if (projection.isComplete) {
      projectionLabel = t('home.complete');
    } else if (projection.daysAheadOfTarget != null) {
      const days = projection.daysAheadOfTarget;
      projectionLabel =
        days > 0
          ? t('home.ahead', { n: days })
          : days < 0
            ? t('home.behind', { n: Math.abs(days) })
            : t('home.onTrack');
    }

    return buildWatchSnapshot({
      hasPlan: true,
      planName: plan.name,
      dailyGoal,
      goalLabel: t('home.versesCount', { n: dailyGoal }),
      upToLabel: isScheduled && scheduledTarget ? formatPosition(scheduledTarget, language) : '',
      positionLabel: projection.position ? formatPosition(projection.position, language) : '',
      percent: projection.percentComplete,
      todayStatus: todayEntry?.status ?? '',
      statusLabel: todayEntry ? t(`status.${todayEntry.status}`) : '',
      projectionLabel,
      isComplete: projection.isComplete,
      language: language === 'ar' ? 'ar' : 'en',
    });
  }, [plan, projection, todayEntry, dailyGoal, isScheduled, scheduledTarget, language, t]);

  // Push the snapshot to the watch when it meaningfully changes.
  const lastSent = useRef<string>('');
  useEffect(() => {
    const wc = getWatchConnectivity();
    if (!wc) return;
    const payload = { ...snapshot };
    const serialized = JSON.stringify(payload);
    if (serialized === lastSent.current) return;
    lastSent.current = serialized;
    try {
      wc.updateApplicationContext(payload as Record<string, unknown>);
    } catch {
      // The watch may be unpaired/unavailable; ignore and retry on the next change.
    }
  }, [snapshot]);

  const applyLog = useCallback(
    (raw: unknown) => {
      const message = parseWatchLogMessage(raw);
      if (!message) return;
      log(message.status, message.verses);
    },
    [log],
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
