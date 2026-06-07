import * as SQLite from 'expo-sqlite';

import { TEMPLATES } from '../domain/templates';
import { createSqliteRepositories } from './repositories/sqlite';
import { Repositories } from './repositories/types';

const DB_NAME = 'memory-app.db';

type Migration = (db: SQLite.SQLiteDatabase) => Promise<void>;

const MIGRATIONS: Migration[] = [
  async (db) => {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS plans (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        template_id TEXT NOT NULL,
        start_date TEXT NOT NULL,
        daily_target INTEGER NOT NULL,
        is_default INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS progress_entries (
        id TEXT PRIMARY KEY NOT NULL,
        plan_id TEXT NOT NULL,
        date TEXT NOT NULL,
        status TEXT NOT NULL,
        verses INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_progress_plan_date ON progress_entries(plan_id, date);
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );
    `);
  },
  // Adds the per-plan template snapshot, backfilling existing plans from the
  // current resource files so older plans keep a complete, frozen definition.
  async (db) => {
    await db.execAsync('ALTER TABLE plans ADD COLUMN template_snapshot TEXT;');
    for (const template of TEMPLATES) {
      await db.runAsync(
        `UPDATE plans SET template_snapshot = ?
         WHERE template_id = ? AND (template_snapshot IS NULL OR template_snapshot = '')`,
        JSON.stringify(template),
        template.id,
      );
    }
  },
];

export async function migrate(db: SQLite.SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const version = row?.user_version ?? 0;
  for (let i = version; i < MIGRATIONS.length; i += 1) {
    await MIGRATIONS[i](db);
  }
  if (version < MIGRATIONS.length) {
    await db.execAsync(`PRAGMA user_version = ${MIGRATIONS.length}`);
  }
}

/**
 * Builds the SQLite-backed repository bundle for native platforms. Swapping in a
 * remote backend later only requires another factory here. Web uses db.web.ts.
 */
export async function initRepositories(): Promise<Repositories> {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  await db.execAsync('PRAGMA foreign_keys = ON;');
  await migrate(db);
  return createSqliteRepositories(db);
}
