import { parseScheduleCsv, scheduleToCsv } from '../scheduleCsv';
import { ExplicitScheduleDay } from '../types';

function day(over: Partial<ExplicitScheduleDay> = {}): ExplicitScheduleDay {
  return {
    day: 1,
    phase: 1,
    isReview: false,
    from: { surah: 1, ayah: 1 },
    to: { surah: 1, ayah: 7 },
    ...over,
  };
}

describe('scheduleToCsv', () => {
  it('emits a header and one row per day with the verse count', () => {
    const csv = scheduleToCsv([
      day(),
      day({ day: 2, from: { surah: 2, ayah: 1 }, to: { surah: 2, ayah: 5 }, isReview: true }),
    ]);
    const lines = csv.trim().split('\n');
    expect(lines[0]).toBe('day,from_surah,from_surah_name,from_ayah,to_surah,to_surah_name,to_ayah,verses,review');
    expect(lines).toHaveLength(3);
    // Al-Fatihah 1:1 -> 1:7 is 7 verses.
    expect(lines[1]).toContain(',7,no');
    expect(lines[2]).toContain(',5,yes');
  });
});

describe('parseScheduleCsv', () => {
  it('round-trips an exported schedule', () => {
    const original = [
      day(),
      day({ day: 2, from: { surah: 2, ayah: 1 }, to: { surah: 2, ayah: 20 }, isReview: true }),
    ];
    const { days, errors } = parseScheduleCsv(scheduleToCsv(original));
    expect(errors).toEqual([]);
    expect(days).toHaveLength(2);
    expect(days[0].from).toEqual({ surah: 1, ayah: 1 });
    expect(days[1].to).toEqual({ surah: 2, ayah: 20 });
    expect(days[1].isReview).toBe(true);
  });

  it('reindexes day numbers sequentially regardless of input', () => {
    const csv = 'from_surah,from_ayah,to_surah,to_ayah\n1,1,1,7\n2,1,2,5\n';
    const { days } = parseScheduleCsv(csv);
    expect(days.map((d) => d.day)).toEqual([1, 2]);
  });

  it('reports missing required columns', () => {
    const { days, errors } = parseScheduleCsv('day,from_surah\n1,1\n');
    expect(days).toHaveLength(0);
    expect(errors[0]).toMatch(/Missing required columns/);
  });

  it('skips invalid rows but keeps valid ones', () => {
    const csv = 'from_surah,from_ayah,to_surah,to_ayah\n1,1,1,7\n1,999,1,7\n2,1,2,5\n';
    const { days, errors } = parseScheduleCsv(csv);
    expect(days).toHaveLength(2);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/Row 3/);
  });

  it('rejects a backwards range', () => {
    const csv = 'from_surah,from_ayah,to_surah,to_ayah\n2,5,1,1\n';
    const { days, errors } = parseScheduleCsv(csv);
    expect(days).toHaveLength(0);
    expect(errors[0]).toMatch(/before the start/);
  });

  it('flags an empty file', () => {
    expect(parseScheduleCsv('').errors).toEqual(['The file is empty.']);
  });
});
