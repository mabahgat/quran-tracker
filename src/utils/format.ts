import { getSurah } from '@/domain/quran';
import { CadenceTemplate, QuranPosition, Surah } from '@/domain/types';
import { isRTL } from '@/i18n';

const LTR_ISOLATE = '\u2066';
const POP_DIRECTIONAL_ISOLATE = '\u2069';

/** Localized surah name: Arabic script in Arabic, transliteration otherwise. */
export function surahName(surah: Surah, language: string): string {
  return isRTL(language) ? surah.nameAr : surah.nameEn;
}

/** Localized template display name from a template (or snapshot) object. Reading
 *  from the object keeps the label correct even for a user-defined schedule that
 *  has since been deleted (the plan keeps its snapshot). */
export function templateNameOf(template: Pick<CadenceTemplate, 'names'>, language: string): string {
  return isRTL(language) ? template.names.ar : template.names.en;
}

/** Human-readable position such as "Al-Baqarah (2) : 56". */
export function formatPosition(position: QuranPosition, language: string): string {
  const surah = getSurah(position.surah);
  return `${surahName(surah, language)} (${position.surah}) : ${position.ayah}`;
}

/** Directional glyphs can be auto-mirrored in RTL text runs; isolate to keep
 *  the intended symbol shape consistent. */
function ltrIsolate(symbol: string): string {
  return `${LTR_ISOLATE}${symbol}${POP_DIRECTIONAL_ISOLATE}`;
}

export function directionalArrow(rtl: boolean): string {
  return ltrIsolate(rtl ? '←' : '→');
}

export function directionalChevron(rtl: boolean): string {
  return ltrIsolate(rtl ? '‹' : '›');
}
