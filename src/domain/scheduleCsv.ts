import { cumulativeIndexOf, getSurah, isValidPosition } from './quran';
import { ExplicitScheduleDay } from './types';

const HEADER = [
  'day',
  'from_surah',
  'from_surah_name',
  'from_ayah',
  'to_surah',
  'to_surah_name',
  'to_ayah',
  'verses',
  'review',
] as const;

const REQUIRED_COLUMNS = ['from_surah', 'from_ayah', 'to_surah', 'to_ayah'] as const;

function escapeField(value: string | number): string {
  const text = String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function versesIn(day: ExplicitScheduleDay): number {
  return cumulativeIndexOf(day.to) - cumulativeIndexOf(day.from) + 1;
}

/** Serializes a day-by-day timetable to CSV — one row per day, with a header. */
export function scheduleToCsv(days: ExplicitScheduleDay[]): string {
  const lines = [HEADER.join(',')];
  for (const day of days) {
    lines.push(
      [
        day.day,
        day.from.surah,
        escapeField(getSurah(day.from.surah).nameEn),
        day.from.ayah,
        day.to.surah,
        escapeField(getSurah(day.to.surah).nameEn),
        day.to.ayah,
        versesIn(day),
        day.isReview ? 'yes' : 'no',
      ].join(','),
    );
  }
  return lines.join('\n') + '\n';
}

/** Splits a single CSV line into fields, honoring double-quoted values. */
function splitCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      fields.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields.map((field) => field.trim());
}

const TRUTHY = new Set(['yes', 'y', 'true', '1', 'review']);

export interface ParseResult {
  days: ExplicitScheduleDay[];
  errors: string[];
}

/**
 * Parses a CSV timetable back into schedule days. Columns are matched by header
 * name (extra columns such as the surah names are ignored), positions are
 * validated, and days are reindexed sequentially. Malformed rows are skipped and
 * reported in `errors` so the caller can surface them without losing valid rows.
 */
export function parseScheduleCsv(text: string): ParseResult {
  const errors: string[] = [];
  const rows = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (rows.length === 0) {
    return { days: [], errors: ['The file is empty.'] };
  }

  const header = splitCsvLine(rows[0]).map((name) => name.toLowerCase());
  const index: Record<string, number> = {};
  header.forEach((name, i) => {
    if (!(name in index)) index[name] = i;
  });

  const missing = REQUIRED_COLUMNS.filter((column) => !(column in index));
  if (missing.length > 0) {
    return { days: [], errors: [`Missing required columns: ${missing.join(', ')}.`] };
  }

  const readInt = (fields: string[], column: string): number => {
    const raw = fields[index[column]];
    return parseInt(raw ?? '', 10);
  };

  const days: ExplicitScheduleDay[] = [];
  for (let i = 1; i < rows.length; i += 1) {
    const fields = splitCsvLine(rows[i]);
    const fromSurah = readInt(fields, 'from_surah');
    const fromAyah = readInt(fields, 'from_ayah');
    const toSurah = readInt(fields, 'to_surah');
    const toAyah = readInt(fields, 'to_ayah');

    const from = { surah: fromSurah, ayah: fromAyah };
    const to = { surah: toSurah, ayah: toAyah };
    if (!isValidPosition(from) || !isValidPosition(to)) {
      errors.push(`Row ${i + 1}: invalid surah/ayah position.`);
      continue;
    }
    if (cumulativeIndexOf(to) < cumulativeIndexOf(from)) {
      errors.push(`Row ${i + 1}: the end position is before the start position.`);
      continue;
    }

    const reviewRaw = 'review' in index ? (fields[index.review] ?? '').toLowerCase() : '';
    days.push({
      day: days.length + 1,
      phase: 1,
      isReview: TRUTHY.has(reviewRaw),
      from,
      to,
    });
  }

  if (days.length === 0 && errors.length === 0) {
    errors.push('No schedule rows were found.');
  }
  return { days, errors };
}
