import { clampVerses } from './quran';
import { ProgressEntry, ProgressStatus } from './types';

/**
 * Verses credited for a logged day.
 * - full: the plan's daily target
 * - partial: the actual number of verses the user entered
 * - missed: zero
 */
export function versesForStatus(
  status: ProgressStatus,
  dailyTarget: number,
  enteredVerses = 0,
): number {
  switch (status) {
    case 'full':
      return Math.max(0, Math.floor(dailyTarget));
    case 'partial':
      return Math.max(0, Math.floor(enteredVerses));
    case 'missed':
    default:
      return 0;
  }
}

/** Total verses memorized across all entries, clamped to the size of the Quran. */
export function totalMemorized(entries: readonly ProgressEntry[]): number {
  const sum = entries.reduce((acc, entry) => acc + Math.max(0, entry.verses), 0);
  return clampVerses(sum);
}

/** Most recent log date (YYYY-MM-DD) or null when there are no entries. */
export function lastLogDate(entries: readonly ProgressEntry[]): string | null {
  if (entries.length === 0) {
    return null;
  }
  return entries.reduce((latest, entry) => (entry.date > latest ? entry.date : latest), entries[0].date);
}
