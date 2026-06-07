import { dailyTargetFor, getTemplate, TEMPLATES } from '../templates';
import { TOTAL_AYAH } from '../quran';

describe('cadence templates (loaded from JSON resources)', () => {
  it('exposes every template from the resources, ordered by duration', () => {
    expect(TEMPLATES.map((t) => t.id)).toEqual([
      '10-days',
      '1-month',
      '2-months',
      '3-months',
      '100-days',
      'incremental-100-days',
      '6-months',
      'incremental-6-months',
      '1-year',
      'incremental-1-year',
      '2-years',
    ]);
  });

  it('tags each template with its kind', () => {
    expect(getTemplate('10-days').kind).toBe('computed');
    expect(getTemplate('1-month').kind).toBe('computed');
    expect(getTemplate('2-months').kind).toBe('computed');
    expect(getTemplate('3-months').kind).toBe('computed');
    expect(getTemplate('100-days').kind).toBe('computed');
    expect(getTemplate('incremental-100-days').kind).toBe('scheduled');
    expect(getTemplate('6-months').kind).toBe('computed');
    expect(getTemplate('incremental-6-months').kind).toBe('scheduled');
    expect(getTemplate('1-year').kind).toBe('computed');
    expect(getTemplate('incremental-1-year').kind).toBe('scheduled');
    expect(getTemplate('2-years').kind).toBe('computed');
  });

  it('uses the expected durations', () => {
    expect(getTemplate('10-days').durationDays).toBe(10);
    expect(getTemplate('1-month').durationDays).toBe(30);
    expect(getTemplate('2-months').durationDays).toBe(60);
    expect(getTemplate('3-months').durationDays).toBe(90);
    expect(getTemplate('100-days').durationDays).toBe(100);
    expect(getTemplate('incremental-100-days').durationDays).toBe(100);
    expect(getTemplate('6-months').durationDays).toBe(182);
    expect(getTemplate('incremental-6-months').durationDays).toBe(182);
    expect(getTemplate('1-year').durationDays).toBe(365);
    expect(getTemplate('incremental-1-year').durationDays).toBe(365);
    expect(getTemplate('2-years').durationDays).toBe(730);
  });

  it('provides the daily verse target from the resource files', () => {
    expect(dailyTargetFor('10-days')).toBe(624);
    expect(dailyTargetFor('1-month')).toBe(208);
    expect(dailyTargetFor('2-months')).toBe(104);
    expect(dailyTargetFor('3-months')).toBe(70);
    expect(dailyTargetFor('100-days')).toBe(63);
    expect(dailyTargetFor('incremental-100-days')).toBe(63);
    expect(dailyTargetFor('6-months')).toBe(35);
    expect(dailyTargetFor('incremental-6-months')).toBe(35);
    expect(dailyTargetFor('1-year')).toBe(18);
    expect(dailyTargetFor('incremental-1-year')).toBe(18);
    expect(dailyTargetFor('2-years')).toBe(9);
  });

  it('keeps each resource internally consistent', () => {
    for (const template of TEMPLATES) {
      expect(template.totalVerses).toBe(TOTAL_AYAH);
      // The stored daily target must be enough to finish within the nominal duration.
      expect(template.dailyTarget).toBe(Math.ceil(TOTAL_AYAH / template.durationDays));
      expect(template.names.en.length).toBeGreaterThan(0);
      expect(template.names.ar.length).toBeGreaterThan(0);
    }
  });

  it('throws for unknown templates', () => {
    expect(() => getTemplate('5-years')).toThrow();
  });
});
