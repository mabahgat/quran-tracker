import { SURAHS } from './quranData';
import { QuranPosition, Surah } from './types';

export const TOTAL_AYAH = SURAHS.reduce((sum, surah) => sum + surah.ayahCount, 0);

/** Cumulative ayah count *before* each surah; cumulativeBefore[i] is the global
 *  index (0-based) of the first ayah of SURAHS[i]. */
const cumulativeBefore: number[] = (() => {
  const acc: number[] = [];
  let running = 0;
  for (const surah of SURAHS) {
    acc.push(running);
    running += surah.ayahCount;
  }
  return acc;
})();

export function getSurah(number: number): Surah {
  const surah = SURAHS[number - 1];
  if (!surah || surah.number !== number) {
    throw new Error(`Invalid surah number: ${number}`);
  }
  return surah;
}

export function clampVerses(verses: number): number {
  if (!Number.isFinite(verses) || verses < 0) {
    return 0;
  }
  return Math.min(Math.floor(verses), TOTAL_AYAH);
}

/** Global 1-based index of a (surah, ayah) position. */
export function cumulativeIndexOf(position: QuranPosition): number {
  return cumulativeBefore[position.surah - 1] + position.ayah;
}

/** True when the position references a real ayah (valid surah and ayah in range). */
export function isValidPosition(position: QuranPosition): boolean {
  const { surah, ayah } = position;
  if (!Number.isInteger(surah) || surah < 1 || surah > SURAHS.length) {
    return false;
  }
  if (!Number.isInteger(ayah) || ayah < 1) {
    return false;
  }
  return ayah <= SURAHS[surah - 1].ayahCount;
}

/** Verses needed to reach (and include) `position` from a given memorized count.
 *  Negative when the position is before what is already memorized. */
export function versesToReachPosition(position: QuranPosition, alreadyMemorized: number): number {
  return cumulativeIndexOf(position) - alreadyMemorized;
}

/** The (surah, ayah) located at a global 1-based index (1..TOTAL_AYAH). */
export function positionAtIndex(index: number): QuranPosition {
  const clamped = Math.max(1, Math.min(Math.floor(index), TOTAL_AYAH));
  let low = 0;
  let high = SURAHS.length - 1;
  while (low < high) {
    const mid = (low + high + 1) >> 1;
    if (cumulativeBefore[mid] < clamped) {
      low = mid;
    } else {
      high = mid - 1;
    }
  }
  return { surah: SURAHS[low].number, ayah: clamped - cumulativeBefore[low] };
}

/** Position of the last memorized ayah given a count of verses memorized from the
 *  start of the Quran, or null if nothing has been memorized yet. */
export function lastMemorizedPosition(versesMemorized: number): QuranPosition | null {
  const verses = clampVerses(versesMemorized);
  if (verses <= 0) {
    return null;
  }
  return positionAtIndex(verses);
}

/** The next ayah to be memorized, or null when the whole Quran is complete. */
export function nextPosition(versesMemorized: number): QuranPosition | null {
  const verses = clampVerses(versesMemorized);
  if (verses >= TOTAL_AYAH) {
    return null;
  }
  return positionAtIndex(verses + 1);
}
