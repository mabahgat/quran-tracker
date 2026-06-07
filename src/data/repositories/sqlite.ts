import type * as SQLite from 'expo-sqlite';

import { getTemplate } from '../../domain/templates';
import { AppEvent, CadenceTemplate, EventDetails, EventType, ExplicitScheduleDay, Plan, ProgressEntry, UserSchedule } from '../../domain/types';
import { newId } from '../../utils/id';
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

interface PlanRow {
  id: string;
  name: string;
  template_id: Plan['templateId'];
  start_date: string;
  daily_target: number;
  template_snapshot: string | null;
  is_default: number;
  created_at: string;
  updated_at: string;
}

interface ProgressRow {
  id: string;
  plan_id: string;
  date: string;
  status: ProgressEntry['status'];
  verses: number;
  created_at: string;
  updated_at: string;
}

interface EventRow {
  id: string;
  type: EventType;
  plan_id: string | null;
  plan_name: string;
  details: string | null;
  created_at: string;
}

interface UserScheduleRow {
  id: string;
  name: string;
  source: string;
  days: string;
  created_at: string;
}

function toUserSchedule(row: UserScheduleRow): UserSchedule {
  let days: ExplicitScheduleDay[] = [];
  try {
    days = JSON.parse(row.days) as ExplicitScheduleDay[];
  } catch {
    days = [];
  }
  return {
    id: row.id,
    name: row.name,
    source: row.source,
    days,
    createdAt: row.created_at,
  };
}

function toEvent(row: EventRow): AppEvent {
  let details: EventDetails = {};
  if (row.details) {
    try {
      details = JSON.parse(row.details) as EventDetails;
    } catch {
      details = {};
    }
  }
  return {
    id: row.id,
    type: row.type,
    planId: row.plan_id,
    planName: row.plan_name,
    details,
    createdAt: row.created_at,
  };
}

function parseSnapshot(raw: string | null, templateId: Plan['templateId']): CadenceTemplate {
  if (raw) {
    try {
      return JSON.parse(raw) as CadenceTemplate;
    } catch {
      // fall through to the live template below
    }
  }
  return getTemplate(templateId);
}

function toPlan(row: PlanRow): Plan {
  return {
    id: row.id,
    name: row.name,
    templateId: row.template_id,
    startDate: row.start_date,
    dailyTarget: row.daily_target,
    templateSnapshot: parseSnapshot(row.template_snapshot, row.template_id),
    isDefault: row.is_default === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toEntry(row: ProgressRow): ProgressEntry {
  return {
    id: row.id,
    planId: row.plan_id,
    date: row.date,
    status: row.status,
    verses: row.verses,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createSqliteRepositories(db: SQLite.SQLiteDatabase): Repositories {
  const now = () => new Date().toISOString();

  const plans: PlanRepository = {
    async list() {
      const rows = await db.getAllAsync<PlanRow>('SELECT * FROM plans ORDER BY created_at ASC');
      return rows.map(toPlan);
    },
    async get(id) {
      const row = await db.getFirstAsync<PlanRow>('SELECT * FROM plans WHERE id = ?', id);
      return row ? toPlan(row) : null;
    },
    async getDefault() {
      const row = await db.getFirstAsync<PlanRow>('SELECT * FROM plans WHERE is_default = 1 LIMIT 1');
      return row ? toPlan(row) : null;
    },
    async create(input: NewPlan) {
      const plan: Plan = {
        id: newId(),
        name: input.name,
        templateId: input.templateId,
        startDate: input.startDate,
        dailyTarget: input.dailyTarget,
        templateSnapshot: input.templateSnapshot,
        isDefault: false,
        createdAt: now(),
        updatedAt: now(),
      };
      await db.runAsync(
        `INSERT INTO plans (id, name, template_id, start_date, daily_target, template_snapshot, is_default, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`,
        plan.id,
        plan.name,
        plan.templateId,
        plan.startDate,
        plan.dailyTarget,
        JSON.stringify(plan.templateSnapshot),
        plan.createdAt,
        plan.updatedAt,
      );
      return plan;
    },
    async update(id, changes: PlanChanges) {
      const existing = await this.get(id);
      if (!existing) {
        throw new Error(`Plan not found: ${id}`);
      }
      const updated: Plan = { ...existing, ...changes, updatedAt: now() };
      await db.runAsync(
        `UPDATE plans SET name = ?, template_id = ?, start_date = ?, daily_target = ?, template_snapshot = ?, updated_at = ? WHERE id = ?`,
        updated.name,
        updated.templateId,
        updated.startDate,
        updated.dailyTarget,
        JSON.stringify(updated.templateSnapshot),
        updated.updatedAt,
        id,
      );
      return updated;
    },
    async remove(id) {
      await db.runAsync('DELETE FROM plans WHERE id = ?', id);
    },
    async setDefault(id) {
      await db.withTransactionAsync(async () => {
        await db.runAsync('UPDATE plans SET is_default = 0, updated_at = ? WHERE is_default = 1', now());
        await db.runAsync('UPDATE plans SET is_default = 1, updated_at = ? WHERE id = ?', now(), id);
      });
    },
  };

  const progress: ProgressRepository = {
    async listByPlan(planId) {
      const rows = await db.getAllAsync<ProgressRow>(
        'SELECT * FROM progress_entries WHERE plan_id = ? ORDER BY date ASC',
        planId,
      );
      return rows.map(toEntry);
    },
    async getByDate(planId, date) {
      const row = await db.getFirstAsync<ProgressRow>(
        'SELECT * FROM progress_entries WHERE plan_id = ? AND date = ?',
        planId,
        date,
      );
      return row ? toEntry(row) : null;
    },
    async upsert(input: NewProgressEntry) {
      const existing = await this.getByDate(input.planId, input.date);
      const timestamp = now();
      if (existing) {
        await db.runAsync(
          'UPDATE progress_entries SET status = ?, verses = ?, updated_at = ? WHERE id = ?',
          input.status,
          input.verses,
          timestamp,
          existing.id,
        );
        return { ...existing, status: input.status, verses: input.verses, updatedAt: timestamp };
      }
      const entry: ProgressEntry = {
        id: newId(),
        planId: input.planId,
        date: input.date,
        status: input.status,
        verses: input.verses,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      await db.runAsync(
        `INSERT INTO progress_entries (id, plan_id, date, status, verses, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        entry.id,
        entry.planId,
        entry.date,
        entry.status,
        entry.verses,
        entry.createdAt,
        entry.updatedAt,
      );
      return entry;
    },
    async remove(id) {
      await db.runAsync('DELETE FROM progress_entries WHERE id = ?', id);
    },
    async removeByPlan(planId) {
      await db.runAsync('DELETE FROM progress_entries WHERE plan_id = ?', planId);
    },
  };

  const settings: SettingsRepository = {
    async get(key) {
      const row = await db.getFirstAsync<{ value: string }>(
        'SELECT value FROM settings WHERE key = ?',
        key,
      );
      return row ? row.value : null;
    },
    async set(key, value) {
      await db.runAsync(
        `INSERT INTO settings (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        key,
        value,
      );
    },
    async remove(key) {
      await db.runAsync('DELETE FROM settings WHERE key = ?', key);
    },
    async all() {
      const rows = await db.getAllAsync<{ key: string; value: string }>('SELECT key, value FROM settings');
      return Object.fromEntries(rows.map((row) => [row.key, row.value]));
    },
  };

  const events: EventRepository = {
    async list(limit) {
      const sql =
        'SELECT * FROM events ORDER BY created_at DESC, id DESC' +
        (typeof limit === 'number' ? ' LIMIT ?' : '');
      const rows =
        typeof limit === 'number'
          ? await db.getAllAsync<EventRow>(sql, limit)
          : await db.getAllAsync<EventRow>(sql);
      return rows.map(toEvent);
    },
    async listByPlan(planId, limit) {
      const sql =
        'SELECT * FROM events WHERE plan_id = ? ORDER BY created_at DESC, id DESC' +
        (typeof limit === 'number' ? ' LIMIT ?' : '');
      const rows =
        typeof limit === 'number'
          ? await db.getAllAsync<EventRow>(sql, planId, limit)
          : await db.getAllAsync<EventRow>(sql, planId);
      return rows.map(toEvent);
    },
    async add(input: NewAppEvent) {
      const event: AppEvent = {
        id: newId(),
        type: input.type,
        planId: input.planId,
        planName: input.planName,
        details: input.details,
        createdAt: now(),
      };
      await db.runAsync(
        `INSERT INTO events (id, type, plan_id, plan_name, details, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        event.id,
        event.type,
        event.planId,
        event.planName,
        JSON.stringify(event.details),
        event.createdAt,
      );
      return event;
    },
  };

  const userSchedules: UserScheduleRepository = {
    async list() {
      const rows = await db.getAllAsync<UserScheduleRow>(
        'SELECT * FROM user_schedules ORDER BY created_at DESC, id DESC',
      );
      return rows.map(toUserSchedule);
    },
    async get(id) {
      const row = await db.getFirstAsync<UserScheduleRow>(
        'SELECT * FROM user_schedules WHERE id = ?',
        id,
      );
      return row ? toUserSchedule(row) : null;
    },
    async create(input: NewUserSchedule) {
      const schedule: UserSchedule = {
        id: newId(),
        name: input.name,
        source: input.source,
        days: input.days,
        createdAt: now(),
      };
      await db.runAsync(
        `INSERT INTO user_schedules (id, name, source, days, created_at)
         VALUES (?, ?, ?, ?, ?)`,
        schedule.id,
        schedule.name,
        schedule.source,
        JSON.stringify(schedule.days),
        schedule.createdAt,
      );
      return schedule;
    },
    async remove(id) {
      await db.runAsync('DELETE FROM user_schedules WHERE id = ?', id);
    },
  };

  return { plans, progress, settings, events, userSchedules };
}
