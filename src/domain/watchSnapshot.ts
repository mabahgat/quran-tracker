/**
 * The compact, watch-facing summary of the default plan. It is sent to the Apple
 * Watch via WatchConnectivity's application context, so every value is a plain
 * JSON/plist-safe primitive (no nulls — absent labels are empty strings). Display
 * strings are pre-localized on the phone, so the watch needs no i18n or Quran
 * data of its own and automatically follows the phone's language.
 */
export interface WatchSnapshot {
  v: 1;
  hasPlan: boolean;
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
  todayStatus: '' | 'full' | 'partial' | 'missed';
  /** Localized label for today's status, or "". */
  statusLabel: string;
  /** Localized projection line (ahead/behind/on track/complete), or "". */
  projectionLabel: string;
  isComplete: boolean;
  /** Phone's active language, so the watch UI mirrors it (text + RTL). */
  language: 'en' | 'ar';
  /** ISO timestamp of when the snapshot was built. */
  updatedAt: string;
}

export type WatchLogStatus = 'full' | 'partial' | 'missed';

/** A log action sent from the watch back to the phone. */
export interface WatchLogMessage {
  type: 'log';
  status: WatchLogStatus;
  /** Verses for a partial entry; 0 for full/missed. */
  verses: number;
}

const LOG_STATUSES: readonly WatchLogStatus[] = ['full', 'partial', 'missed'];

export interface WatchSnapshotInput {
  hasPlan: boolean;
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
  language?: 'en' | 'ar';
  now?: Date;
}

/** Assembles a plist-safe {@link WatchSnapshot}, clamping the percentage and
 *  defaulting every absent field so the payload never carries null/undefined. */
export function buildWatchSnapshot(input: WatchSnapshotInput): WatchSnapshot {
  const percent = Math.max(0, Math.min(100, Math.round(input.percent ?? 0)));
  return {
    v: 1,
    hasPlan: input.hasPlan,
    planName: input.planName ?? '',
    dailyGoal: Math.max(0, Math.round(input.dailyGoal ?? 0)),
    goalLabel: input.goalLabel ?? '',
    upToLabel: input.upToLabel ?? '',
    positionLabel: input.positionLabel ?? '',
    percent,
    todayStatus: input.todayStatus ?? '',
    statusLabel: input.statusLabel ?? '',
    projectionLabel: input.projectionLabel ?? '',
    isComplete: input.isComplete ?? false,
    language: input.language === 'ar' ? 'ar' : 'en',
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
  const versesRaw = record.verses;
  const verses =
    typeof versesRaw === 'number' && Number.isFinite(versesRaw) && versesRaw > 0
      ? Math.floor(versesRaw)
      : 0;
  return { type: 'log', status: record.status as WatchLogStatus, verses };
}
