import { getSurah } from '@/domain/quran';
import { TEMPLATES } from '@/domain/templates';
import { Surah, QuranPosition } from '@/domain/types';
import { isRTL } from '@/i18n';

/** Localized surah name: Arabic script in Arabic, transliteration otherwise. */
export function surahName(surah: Surah, language: string): string {
  return isRTL(language) ? surah.nameAr : surah.nameEn;
}

/**
 * Localized template name, read straight from the JSON resource so the displayed
 * label always reflects the resource files. Falls back to the raw id (e.g. for a
 * historical activity-log entry that references a template no longer present).
 */
export function templateName(id: string, language: string): string {
  const template = TEMPLATES.find((t) => t.id === id);
  if (!template) return id;
  return isRTL(language) ? template.names.ar : template.names.en;
}

/** Human-readable position such as "Al-Baqarah (2) : 56". */
export function formatPosition(position: QuranPosition, language: string): string {
  const surah = getSurah(position.surah);
  return `${surahName(surah, language)} (${position.surah}) : ${position.ayah}`;
}
