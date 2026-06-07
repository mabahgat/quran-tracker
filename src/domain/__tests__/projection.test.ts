import { computeProjection } from '../projection';
import { TOTAL_AYAH } from '../quran';
import { dailyTargetFor, getTemplate } from '../templates';
import { Plan, ProgressEntry, ProgressStatus, TemplateId } from '../types';
import { addDays } from '../../utils/date';

function makePlan(overrides: Partial<Plan> = {}): Plan {
  const templateId: TemplateId = overrides.templateId ?? '100-days';
  return {
    id: 'plan-1',
    name: 'Test Plan',
    templateId,
    startDate: '2025-01-01',
    dailyTarget: dailyTargetFor(templateId),
    templateSnapshot: getTemplate(templateId),
    isDefault: true,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

function entry(date: string, verses: number, status: ProgressStatus = 'partial'): ProgressEntry {
  return {
    id: date,
    planId: 'plan-1',
    date,
    status,
    verses,
    createdAt: `${date}T00:00:00Z`,
    updatedAt: `${date}T00:00:00Z`,
  };
}

describe('computeProjection', () => {
  it('reports an empty plan with no projection but a target date', () => {
    const plan = makePlan();
    const result = computeProjection(plan, [], '2025-01-01');

    expect(result.totalMemorized).toBe(0);
    expect(result.remaining).toBe(TOTAL_AYAH);
    expect(result.position).toBeNull();
    expect(result.nextPosition).toEqual({ surah: 1, ayah: 1 });
    expect(result.ratePerDay).toBeNull();
    expect(result.projectedFinishDate).toBeNull();
    expect(result.targetFinishDate).toBe(addDays('2025-01-01', 99));
    expect(result.daysAheadOfTarget).toBeNull();
  });

  it('uses the plan template snapshot for the target date, not the live template', () => {
    // Simulate a plan whose stored snapshot differs from the current resource
    // (e.g. the JSON file was later edited): the frozen 50-day duration wins.
    const snapshot = { ...getTemplate('100-days'), durationDays: 50 };
    const plan = makePlan({ templateSnapshot: snapshot });
    const result = computeProjection(plan, [], '2025-01-01');

    expect(result.targetFinishDate).toBe(addDays('2025-01-01', 49));
  });

  it('projects slightly ahead when keeping the 100-day pace', () => {
    const plan = makePlan();
    const result = computeProjection(plan, [entry('2025-01-01', 63, 'full')], '2025-01-01');

    expect(result.totalMemorized).toBe(63);
    expect(result.ratePerDay).toBeCloseTo(63);
    expect(result.position).toEqual({ surah: 2, ayah: 56 });
    expect(result.projectedFinishDate).toBe(addDays('2025-01-01', Math.ceil((TOTAL_AYAH - 63) / 63)));
    expect(result.daysAheadOfTarget).toBe(1);
  });

  it('gives no projection when every day is missed', () => {
    const plan = makePlan();
    const entries = [entry('2025-01-01', 0, 'missed'), entry('2025-01-02', 0, 'missed')];
    const result = computeProjection(plan, entries, '2025-01-02');

    expect(result.totalMemorized).toBe(0);
    expect(result.ratePerDay).toBeNull();
    expect(result.projectedFinishDate).toBeNull();
    expect(result.loggedDays).toBe(2);
  });

  it('detects falling behind the target', () => {
    const plan = makePlan({ templateId: '1-year' });
    const result = computeProjection(plan, [entry('2025-01-10', 5)], '2025-01-10');

    expect(result.elapsedDays).toBe(10);
    expect(result.ratePerDay).toBeCloseTo(0.5);
    expect(result.daysAheadOfTarget).not.toBeNull();
    expect(result.daysAheadOfTarget!).toBeLessThan(0);
  });

  it('marks completion using the last log date', () => {
    const plan = makePlan();
    const result = computeProjection(plan, [entry('2025-03-01', TOTAL_AYAH, 'full')], '2025-03-02');

    expect(result.isComplete).toBe(true);
    expect(result.remaining).toBe(0);
    expect(result.position).toEqual({ surah: 114, ayah: 6 });
    expect(result.nextPosition).toBeNull();
    expect(result.percentComplete).toBe(100);
    expect(result.projectedFinishDate).toBe('2025-03-01');
  });

  it('counts distinct logged days', () => {
    const plan = makePlan();
    const entries = [entry('2025-01-01', 10), entry('2025-01-02', 10), entry('2025-01-03', 10)];
    const result = computeProjection(plan, entries, '2025-01-03');

    expect(result.loggedDays).toBe(3);
    expect(result.totalMemorized).toBe(30);
  });
});
