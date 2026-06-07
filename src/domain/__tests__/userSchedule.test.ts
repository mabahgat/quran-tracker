import { TOTAL_AYAH } from '../quran';
import { ExplicitScheduleDay, UserSchedule } from '../types';
import { userScheduleToExplicit, userScheduleToTemplate } from '../userSchedule';

function makeSchedule(days: ExplicitScheduleDay[]): UserSchedule {
  return {
    id: 'user-1',
    name: 'My Plan',
    source: 'my-plan.csv',
    days,
    createdAt: '2025-01-01T00:00:00Z',
  };
}

const sampleDays: ExplicitScheduleDay[] = [
  { day: 1, phase: 1, isReview: false, from: { surah: 1, ayah: 1 }, to: { surah: 1, ayah: 7 } },
  { day: 2, phase: 1, isReview: false, from: { surah: 2, ayah: 1 }, to: { surah: 2, ayah: 50 } },
];

describe('userScheduleToTemplate', () => {
  it('derives a scheduled, user-defined template that embeds the days', () => {
    const template = userScheduleToTemplate(makeSchedule(sampleDays));
    expect(template.id).toBe('user-1');
    expect(template.kind).toBe('scheduled');
    expect(template.userDefined).toBe(true);
    expect(template.names).toEqual({ en: 'My Plan', ar: 'My Plan' });
    expect(template.durationDays).toBe(2);
    expect(template.totalVerses).toBe(TOTAL_AYAH);
    expect(template.schedule).toHaveLength(2);
  });

  it('never produces a zero daily target for an empty schedule', () => {
    const template = userScheduleToTemplate(makeSchedule([]));
    expect(template.durationDays).toBe(1);
    expect(template.dailyTarget).toBeGreaterThan(0);
  });
});

describe('userScheduleToExplicit', () => {
  it('builds an explicit schedule with sequential days', () => {
    const explicit = userScheduleToExplicit(makeSchedule(sampleDays));
    expect(explicit.templateId).toBe('user-1');
    expect(explicit.source).toBe('my-plan.csv');
    expect(explicit.totalDays).toBe(2);
    expect(explicit.days.map((d) => d.day)).toEqual([1, 2]);
  });
});
