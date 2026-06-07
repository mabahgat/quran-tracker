import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { useRepositories } from '@/data/RepositoryProvider';
import { AppEvent } from '@/domain/types';

interface UseEventsOptions {
  /** When set, only events for this plan are returned. */
  planId?: string;
  limit?: number;
}

export function useEvents(options: UseEventsOptions = {}) {
  const { planId, limit } = options;
  const repositories = useRepositories();
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const list = planId
      ? await repositories.events.listByPlan(planId, limit)
      : await repositories.events.list(limit);
    setEvents(list);
    setLoading(false);
  }, [repositories, planId, limit]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  return { events, loading, reload };
}
