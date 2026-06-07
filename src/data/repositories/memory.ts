import { AppEvent, Plan, ProgressEntry, UserSchedule } from '../../domain/types';
import { sortEventsDesc } from '../../domain/events';
import {
  EventRepository,
  NewAppEvent,
  NewPlan,
  NewProgressEntry,
  NewUserSchedule,
  PlanChanges,
  PlanRepository,
  ProgressRepository,
  Repositories,
  SettingsRepository,
  UserScheduleRepository,
} from './types';

function fallbackId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

/**
 * In-memory implementation of the repositories. Used for unit tests and as the
 * web-preview backend. Holds no external dependencies so it stays portable.
 */
export function createMemoryRepositories(idGen: () => string = fallbackId): Repositories {
  const plans = new Map<string, Plan>();
  const progress = new Map<string, ProgressEntry>();
  const settings = new Map<string, string>();
  const events = new Map<string, AppEvent>();
  const userSchedules = new Map<string, UserSchedule>();

  const now = () => new Date().toISOString();

  const planRepo: PlanRepository = {
    async list() {
      return [...plans.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    },
    async get(id) {
      return plans.get(id) ?? null;
    },
    async getDefault() {
      return [...plans.values()].find((plan) => plan.isDefault) ?? null;
    },
    async create(input: NewPlan) {
      const timestamp = now();
      const plan: Plan = {
        id: idGen(),
        name: input.name,
        templateId: input.templateId,
        startDate: input.startDate,
        dailyTarget: input.dailyTarget,
        templateSnapshot: input.templateSnapshot,
        isDefault: false,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      plans.set(plan.id, plan);
      return plan;
    },
    async update(id, changes: PlanChanges) {
      const existing = plans.get(id);
      if (!existing) {
        throw new Error(`Plan not found: ${id}`);
      }
      const updated: Plan = { ...existing, ...changes, updatedAt: now() };
      plans.set(id, updated);
      return updated;
    },
    async remove(id) {
      plans.delete(id);
    },
    async setDefault(id) {
      if (!plans.has(id)) {
        throw new Error(`Plan not found: ${id}`);
      }
      for (const [planId, plan] of plans) {
        plans.set(planId, { ...plan, isDefault: planId === id });
      }
    },
  };

  const progressRepo: ProgressRepository = {
    async listByPlan(planId) {
      return [...progress.values()]
        .filter((entry) => entry.planId === planId)
        .sort((a, b) => a.date.localeCompare(b.date));
    },
    async getByDate(planId, date) {
      return (
        [...progress.values()].find((entry) => entry.planId === planId && entry.date === date) ?? null
      );
    },
    async upsert(input: NewProgressEntry) {
      const existing = [...progress.values()].find(
        (entry) => entry.planId === input.planId && entry.date === input.date,
      );
      const timestamp = now();
      const entry: ProgressEntry = existing
        ? { ...existing, status: input.status, verses: input.verses, updatedAt: timestamp }
        : {
            id: idGen(),
            planId: input.planId,
            date: input.date,
            status: input.status,
            verses: input.verses,
            createdAt: timestamp,
            updatedAt: timestamp,
          };
      progress.set(entry.id, entry);
      return entry;
    },
    async remove(id) {
      progress.delete(id);
    },
    async removeByPlan(planId) {
      for (const [id, entry] of progress) {
        if (entry.planId === planId) {
          progress.delete(id);
        }
      }
    },
  };

  const settingsRepo: SettingsRepository = {
    async get(key) {
      return settings.get(key) ?? null;
    },
    async set(key, value) {
      settings.set(key, value);
    },
    async remove(key) {
      settings.delete(key);
    },
    async all() {
      return Object.fromEntries(settings.entries());
    },
  };

  const eventsRepo: EventRepository = {
    async list(limit) {
      const sorted = sortEventsDesc([...events.values()]);
      return typeof limit === 'number' ? sorted.slice(0, limit) : sorted;
    },
    async listByPlan(planId, limit) {
      const sorted = sortEventsDesc(
        [...events.values()].filter((event) => event.planId === planId),
      );
      return typeof limit === 'number' ? sorted.slice(0, limit) : sorted;
    },
    async add(input: NewAppEvent) {
      const event: AppEvent = {
        id: idGen(),
        type: input.type,
        planId: input.planId,
        planName: input.planName,
        details: input.details,
        createdAt: now(),
      };
      events.set(event.id, event);
      return event;
    },
  };

  const userSchedulesRepo: UserScheduleRepository = {
    async list() {
      return [...userSchedules.values()].sort((a, b) => {
        if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? 1 : -1;
        return a.id < b.id ? 1 : -1;
      });
    },
    async get(id) {
      return userSchedules.get(id) ?? null;
    },
    async create(input: NewUserSchedule) {
      const schedule: UserSchedule = {
        id: idGen(),
        name: input.name,
        source: input.source,
        days: input.days,
        createdAt: now(),
      };
      userSchedules.set(schedule.id, schedule);
      return schedule;
    },
    async remove(id) {
      userSchedules.delete(id);
    },
  };

  return {
    plans: planRepo,
    progress: progressRepo,
    settings: settingsRepo,
    events: eventsRepo,
    userSchedules: userSchedulesRepo,
  };
}
