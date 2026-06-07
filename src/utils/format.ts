import { getSurah } from '@/domain/quran';
import { Surah, QuranPosition } from '@/domain/types';
import { isRTL } from '@/i18n';

/** Localized surah name: Arabic script in Arabic, transliteration otherwise. */
export function surahName(surah: Surah, language: string): string {
  return isRTL(language) ? surah.nameAr : surah.nameEn;
}

/** Human-readable position such as "Al-Baqarah (2) : 56". */
export function formatPosition(position: QuranPosition, language: string): string {
  const surah = getSurah(position.surah);
  return `${surahName(surah, language)} (${position.surah}) : ${position.ayah}`;
}
