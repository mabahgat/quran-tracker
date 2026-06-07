import { lastLogDate, totalMemorized, versesForStatus } from '../progress';
import { TOTAL_AYAH } from '../quran';
import { ProgressEntry } from '../types';

function entry(date: string, verses: number): ProgressEntry {
  return {
    id: date,
    planId: 'p',
    date,
    status: verses > 0 ? 'partial' : 'missed',
    verses,
    createdAt: `${date}T00:00:00Z`,
    updatedAt: `${date}T00:00:00Z`,
  };
}

describe('versesForStatus', () => {
  it('credits the full daily target for a full day', () => {
    expect(versesForStatus('full', 63)).toBe(63);
    expect(versesForStatus('full', 63, 5)).toBe(63);
  });

  it('credits the entered amount for a partial day', () => {
    expect(versesForStatus('partial', 63, 20)).toBe(20);
    expect(versesForStatus('partial', 63)).toBe(0);
    expect(versesForStatus('partial', 63, -4)).toBe(0);
  });

  it('credits nothing for a missed day', () => {
    expect(versesForStatus('missed', 63, 99)).toBe(0);
  });
});

describe('totalMemorized', () => {
  it('sums verses across entries', () => {
    expect(totalMemorized([entry('2025-01-01', 10), entry('2025-01-02', 15)])).toBe(25);
  });

  it('clamps to the size of the Quran', () => {
    expect(totalMemorized([entry('2025-01-01', 9999), entry('2025-01-02', 9999)])).toBe(TOTAL_AYAH);
  });

  it('is zero with no entries', () => {
    expect(totalMemorized([])).toBe(0);
  });
});

describe('lastLogDate', () => {
  it('returns the most recent date', () => {
    expect(lastLogDate([entry('2025-01-03', 1), entry('2025-01-01', 1), entry('2025-01-02', 1)])).toBe(
      '2025-01-03',
    );
  });

  it('returns null with no entries', () => {
    expect(lastLogDate([])).toBeNull();
  });
});
