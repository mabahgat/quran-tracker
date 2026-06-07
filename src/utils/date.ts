const MS_PER_DAY = 86_400_000;

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map((p) => parseInt(p, 10));
  return new Date(Date.UTC(y, m - 1, d));
}

export function toISODate(date: Date): string {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

export function todayISO(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function addDays(iso: string, days: number): string {
  return toISODate(new Date(parseISODate(iso).getTime() + days * MS_PER_DAY));
}

export function diffDays(fromIso: string, toIso: string): number {
  return Math.round((parseISODate(toIso).getTime() - parseISODate(fromIso).getTime()) / MS_PER_DAY);
}

export function daysInclusive(fromIso: string, toIso: string): number {
  return diffDays(fromIso, toIso) + 1;
}

/** Local-time parts of an ISO timestamp, for displaying the activity log. */
export function localDateTimeParts(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return { date: iso, time: '' };
  }
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

