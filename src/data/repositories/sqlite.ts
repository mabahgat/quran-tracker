import type * as SQLite from 'expo-sqlite';

import { getTemplate } from '../../domain/templates';
import { CadenceTemplate, Plan, ProgressEntry } from '../../domain/types';
import { newId } from '../../utils/id';
import {
  NewPlan,
  NewProgressEntry,
  PlanChanges,
  PlanRepository,
  ProgressRepository,
  Repositories,
  SettingsRepository,
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

  return { plans, progress, settings };
}
