import { getExplicitSchedule, nextScheduledChunk } from '../explicitSchedule';
import { cumulativeIndexOf, isValidPosition, TOTAL_AYAH } from '../quran';
import { TemplateId } from '../types';

const SCHEDULED: { id: TemplateId; totalDays: number; reviewEvery: number }[] = [
  { id: 'incremental-100-days', totalDays: 100, reviewEvery: 10 },
  { id: 'incremental-6-months', totalDays: 182, reviewEvery: 7 },
  { id: 'incremental-1-year', totalDays: 364, reviewEvery: 7 },
];

describe('explicit schedules (from Excel resources)', () => {
  it('exist only for the scheduled templates', () => {
    expect(getExplicitSchedule('incremental-100-days')).not.toBeNull();
    expect(getExplicitSchedule('incremental-6-months')).not.toBeNull();
    expect(getExplicitSchedule('incremental-1-year')).not.toBeNull();
    expect(getExplicitSchedule('100-days')).toBeNull();
    expect(getExplicitSchedule('6-months')).toBeNull();
    expect(getExplicitSchedule('1-year')).toBeNull();
    expect(getExplicitSchedule('2-years')).toBeNull();
  });

  describe.each(SCHEDULED)('$id', ({ id, totalDays, reviewEvery }) => {
    const schedule = getExplicitSchedule(id)!;

    it(`has ${totalDays} sequential days`, () => {
      expect(schedule.totalDays).toBe(totalDays);
      schedule.days.forEach((day, index) => expect(day.day).toBe(index + 1));
    });

    it('marks review days on the expected cadence', () => {
      const reviewDays = schedule.days.filter((d) => d.isReview).map((d) => d.day);
      expect(reviewDays.length).toBeGreaterThan(0);
      for (const day of reviewDays) {
        expect(day % reviewEvery).toBe(0);
      }
    });

    it('uses valid positions everywhere and ends at page 604', () => {
      expect(schedule.totalPages).toBe(604);
      for (const day of schedule.days) {
        expect(isValidPosition({ surah: day.from.surah, ayah: day.from.ayah })).toBe(true);
        expect(isValidPosition({ surah: day.to.surah, ayah: day.to.ayah })).toBe(true);
        expect(day.pages).toBeGreaterThan(0);
      }
    });

    it('starts at Al-Fatihah 1:1 (page 1) and ends at An-Nas 114:6 (page 604)', () => {
      const memorize = schedule.days.filter((d) => !d.isReview);
      expect(memorize[0].from).toEqual({ surah: 1, ayah: 1, page: 1 });
      expect(memorize[memorize.length - 1].to).toEqual({ surah: 114, ayah: 6, page: 604 });
    });

    it('memorization days are continuous and cover the whole Quran (6236 ayat)', () => {
      const memorize = schedule.days.filter((d) => !d.isReview);
      let expected = 1;
      for (const day of memorize) {
        expect(cumulativeIndexOf(day.from)).toBe(expected);
        const end = cumulativeIndexOf(day.to);
        expect(end).toBeGreaterThanOrEqual(cumulativeIndexOf(day.from));
        expected = end + 1;
      }
      expect(expected - 1).toBe(TOTAL_AYAH);
    });

    it('covers pages 1..604 contiguously across memorization days', () => {
      const memorize = schedule.days.filter((d) => !d.isReview);
      let expectedPage = 1;
      for (const day of memorize) {
        expect(day.from.page).toBe(expectedPage);
        expectedPage = day.to.page + 1;
      }
      expect(expectedPage - 1).toBe(604);
    });
  });
});

describe('nextScheduledChunk', () => {
  const schedule = getExplicitSchedule('incremental-100-days')!;
  const memorize = schedule.days.filter((d) => !d.isReview);

  it('returns the first portion when nothing is memorized', () => {
    const chunk = nextScheduledChunk(schedule, 0);
    expect(chunk).not.toBeNull();
    expect(chunk!.goalVerses).toBe(cumulativeIndexOf(memorize[0].to));
    expect(chunk!.targetTo).toEqual({ surah: memorize[0].to.surah, ayah: memorize[0].to.ayah });
  });

  it('advances to the next portion exactly at a boundary', () => {
    const firstEnd = cumulativeIndexOf(memorize[0].to);
    const chunk = nextScheduledChunk(schedule, firstEnd);
    expect(chunk!.targetTo).toEqual({ surah: memorize[1].to.surah, ayah: memorize[1].to.ayah });
    expect(chunk!.goalVerses).toBe(cumulativeIndexOf(memorize[1].to) - firstEnd);
  });

  it('returns only the remainder when mid-portion (e.g. after a partial day)', () => {
    const firstEnd = cumulativeIndexOf(memorize[0].to);
    const chunk = nextScheduledChunk(schedule, firstEnd - 3);
    expect(chunk!.targetTo).toEqual({ surah: memorize[0].to.surah, ayah: memorize[0].to.ayah });
    expect(chunk!.goalVerses).toBe(3);
  });

  it('walking the chunks sums to the whole Quran across the memorize days', () => {
    let done = 0;
    let steps = 0;
    while (done < TOTAL_AYAH) {
      const chunk = nextScheduledChunk(schedule, done);
      expect(chunk).not.toBeNull();
      done += chunk!.goalVerses;
      steps += 1;
    }
    expect(done).toBe(TOTAL_AYAH);
    expect(steps).toBe(memorize.length);
  });

  it('returns null once the whole Quran is memorized', () => {
    expect(nextScheduledChunk(schedule, TOTAL_AYAH)).toBeNull();
  });
});
