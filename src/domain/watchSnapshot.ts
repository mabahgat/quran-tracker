/**
 * The watch-facing payload sent over WatchConnectivity. Every value is a plain
 * JSON/plist-safe primitive (no nulls — absent labels are empty strings). Display
 * strings are pre-localized on the phone, so the watch needs no i18n or Quran
 * data of its own and automatically follows the phone's language.
 *
 * The payload carries ALL of the user's plans so the watch can page between them
 * without changing the phone's default plan.
 */
export type WatchLogStatus = 'full' | 'partial' | 'missed';

/** One plan's compact glance, as shown on a single watch page. */
export interface WatchPlanEntry {
  /** Plan id, so a log action from the watch targets the right plan. */
  id: string;
  isDefault: boolean;
  planName: string;
  /** Verses to memorize/recite today. */
  dailyGoal: number;
  /** Localized "{n} verses" goal label. */
  goalLabel: string;
  /** Localized "reach up to" position, or "" when not applicable. */
  upToLabel: string;
  /** Localized current position, or "" when nothing is done yet. */
  positionLabel: string;
  /** Whole-plan completion, 0..100. */
  percent: number;
  /** Today's logged status, or "" if nothing logged today. */
  todayStatus: '' | WatchLogStatus;
  /** Localized label for today's status, or "". */
  statusLabel: string;
  /** Localized projection line (ahead/behind/on track/complete), or "". */
  projectionLabel: string;
  isComplete: boolean;
}

export interface WatchPayload {
  v: 1;
  /** False when the user has no plans at all. */
  hasPlan: boolean;
  /** Phone's active language, so the watch UI mirrors it (text + RTL). */
  language: 'en' | 'ar';
  /** Index into `plans` of the default plan — the page the watch opens on. */
  defaultIndex: number;
  plans: WatchPlanEntry[];
  /** ISO timestamp of when the payload was built. */
  updatedAt: string;
}

/** A log action sent from the watch back to the phone. */
export interface WatchLogMessage {
  type: 'log';
  /** Which plan to log against; empty falls back to the default on the phone. */
  planId: string;
  status: WatchLogStatus;
  /** Verses for a partial entry; 0 for full/missed. */
  verses: number;
}

const LOG_STATUSES: readonly WatchLogStatus[] = ['full', 'partial', 'missed'];

export interface WatchPlanEntryInput {
  id: string;
  isDefault?: boolean;
  planName?: string;
  dailyGoal?: number;
  goalLabel?: string;
  upToLabel?: string;
  positionLabel?: string;
  percent?: number;
  todayStatus?: '' | WatchLogStatus;
  statusLabel?: string;
  projectionLabel?: string;
  isComplete?: boolean;
}

/** Assembles a plist-safe per-plan entry, clamping the percentage and defaulting
 *  every absent field so the payload never carries null/undefined. */
export function buildWatchPlanEntry(input: WatchPlanEntryInput): WatchPlanEntry {
  return {
    id: input.id,
    isDefault: input.isDefault ?? false,
    planName: input.planName ?? '',
    dailyGoal: Math.max(0, Math.round(input.dailyGoal ?? 0)),
    goalLabel: input.goalLabel ?? '',
    upToLabel: input.upToLabel ?? '',
    positionLabel: input.positionLabel ?? '',
    percent: Math.max(0, Math.min(100, Math.round(input.percent ?? 0))),
    todayStatus: input.todayStatus ?? '',
    statusLabel: input.statusLabel ?? '',
    projectionLabel: input.projectionLabel ?? '',
    isComplete: input.isComplete ?? false,
  };
}

export interface WatchPayloadInput {
  language?: 'en' | 'ar';
  defaultIndex?: number;
  plans?: WatchPlanEntry[];
  now?: Date;
}

/** Wraps the per-plan entries into the full, plist-safe watch payload. */
export function buildWatchPayload(input: WatchPayloadInput): WatchPayload {
  const plans = input.plans ?? [];
  const defaultIndex =
    input.defaultIndex != null && input.defaultIndex >= 0 && input.defaultIndex < plans.length
      ? input.defaultIndex
      : 0;
  return {
    v: 1,
    hasPlan: plans.length > 0,
    language: input.language === 'ar' ? 'ar' : 'en',
    defaultIndex,
    plans,
    updatedAt: (input.now ?? new Date()).toISOString(),
  };
}

/** Validates and normalizes a message received from the watch, or null if it is
 *  not a well-formed log action. */
export function parseWatchLogMessage(raw: unknown): WatchLogMessage | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  if (record.type !== 'log') return null;
  if (!LOG_STATUSES.includes(record.status as WatchLogStatus)) return null;
  const planId = typeof record.planId === 'string' ? record.planId : '';
  const versesRaw = record.verses;
  const verses =
    typeof versesRaw === 'number' && Number.isFinite(versesRaw) && versesRaw > 0
      ? Math.floor(versesRaw)
      : 0;
  return { type: 'log', planId, status: record.status as WatchLogStatus, verses };
}
