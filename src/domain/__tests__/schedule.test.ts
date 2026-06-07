import { generateSchedule } from '../schedule';
import { TOTAL_AYAH } from '../quran';
import { dailyTargetFor, TEMPLATES } from '../templates';
import { addDays } from '../../utils/date';

describe('generateSchedule', () => {
  it('starts at Al-Fatihah 1:1 and finishes at An-Nas 114:6 for every template', () => {
    for (const template of TEMPLATES) {
      const schedule = generateSchedule(template.id, '2025-01-01');
      const first = schedule.days[0];
      const last = schedule.days[schedule.days.length - 1];

      expect(first.startPosition).toEqual({ surah: 1, ayah: 1 });
      expect(last.endPosition).toEqual({ surah: 114, ayah: 6 });
      expect(last.cumulative).toBe(TOTAL_AYAH);
    }
  });

  it('uses ceil(total / dailyTarget) days and the right dates', () => {
    const schedule = generateSchedule('100-days', '2025-01-01');
    const dailyTarget = dailyTargetFor('100-days');

    expect(schedule.dailyTarget).toBe(63);
    expect(schedule.totalDays).toBe(Math.ceil(TOTAL_AYAH / dailyTarget));
    expect(schedule.totalDays).toBe(99);
    expect(schedule.nominalDays).toBe(100);
    expect(schedule.days[0].date).toBe('2025-01-01');
    expect(schedule.finishDate).toBe(addDays('2025-01-01', schedule.totalDays - 1));
  });

  it('credits the daily target each day except possibly the last', () => {
    const schedule = generateSchedule('6-months', '2025-01-01');
    const target = schedule.dailyTarget;

    schedule.days.slice(0, -1).forEach((d) => expect(d.versesThisDay).toBe(target));
    const last = schedule.days[schedule.days.length - 1];
    expect(last.versesThisDay).toBeGreaterThan(0);
    expect(last.versesThisDay).toBeLessThanOrEqual(target);
  });

  it('produces a strictly increasing, contiguous cumulative covering all verses', () => {
    const schedule = generateSchedule('1-year', '2025-03-10');
    let previousCumulative = 0;
    let summed = 0;
    schedule.days.forEach((d, index) => {
      expect(d.day).toBe(index + 1);
      expect(d.cumulative).toBeGreaterThan(previousCumulative);
      expect(d.date).toBe(addDays('2025-03-10', index));
      summed += d.versesThisDay;
      previousCumulative = d.cumulative;
    });
    expect(summed).toBe(TOTAL_AYAH);
  });

  it('makes each day continue exactly where the previous ended', () => {
    const schedule = generateSchedule('2-years', '2025-01-01');
    for (let i = 1; i < schedule.days.length; i += 1) {
      const prevEnd = schedule.days[i - 1].cumulative;
      const expectedStart = schedule.days[i].startPosition;
      // start of day i should be the verse right after the previous cumulative
      expect(schedule.days[i].cumulative - schedule.days[i].versesThisDay).toBe(prevEnd);
      expect(expectedStart).toBeDefined();
    }
  });
});
