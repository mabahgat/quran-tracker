import { summarizePlan } from '../planSummary';
import { cumulativeIndexOf, TOTAL_AYAH } from '../quran';
import { getTemplate } from '../templates';
import { Plan, ProgressEntry } from '../types';

function makePlan(over: Partial<Plan> = {}): Plan {
  const templateId = over.templateId ?? '100-days';
  const snapshot = getTemplate(templateId);
  return {
    id: 'plan-1',
    name: 'Test',
    templateId,
    startDate: '2025-01-01',
    dailyTarget: snapshot.dailyTarget,
    templateSnapshot: snapshot,
    isDefault: true,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    ...over,
  };
}

function entry(date: string, verses: number, status: ProgressEntry['status'] = 'full'): ProgressEntry {
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

describe('summarizePlan', () => {
  it('uses the flat daily target for a computed plan', () => {
    const summary = summarizePlan(makePlan(), [], '2025-01-01');
    expect(summary.isScheduled).toBe(false);
    expect(summary.dailyGoal).toBe(63);
    expect(summary.scheduledTarget).toBeNull();
    expect(summary.todayEntry).toBeNull();
    expect(summary.projection.totalMemorized).toBe(0);
  });

  it('reflects logged progress and today’s entry', () => {
    const entries = [entry('2025-01-01', 63), entry('2025-01-02', 20, 'partial')];
    const summary = summarizePlan(makePlan(), entries, '2025-01-02');
    expect(summary.projection.totalMemorized).toBe(83);
    expect(summary.todayEntry?.status).toBe('partial');
    // The goal ignores how today is logged (based on verses before today).
    expect(summary.dailyGoal).toBe(63);
  });

  it('uses the schedule chunk for a scheduled plan', () => {
    const summary = summarizePlan(makePlan({ templateId: 'incremental-100-days' }), [], '2025-01-01');
    expect(summary.isScheduled).toBe(true);
    // Day 1 of the incremental schedule reaches Al-Baqarah 2:5.
    expect(summary.scheduledTarget).toEqual({ surah: 2, ayah: 5 });
    expect(summary.dailyGoal).toBe(cumulativeIndexOf({ surah: 2, ayah: 5 }));
  });

  it('marks completion when the whole Quran is done', () => {
    const summary = summarizePlan(makePlan(), [entry('2025-03-01', TOTAL_AYAH)], '2025-03-02');
    expect(summary.projection.isComplete).toBe(true);
    expect(summary.projection.percentComplete).toBe(100);
  });
});
