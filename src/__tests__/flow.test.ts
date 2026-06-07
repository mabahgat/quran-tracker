import { createMemoryRepositories } from '../data/repositories/memory';
import { computeProjection } from '../domain/projection';
import { versesForStatus } from '../domain/progress';
import { positionAtIndex } from '../domain/quran';
import { dailyTargetFor, getTemplate } from '../domain/templates';
import { addDays, daysInclusive } from '../utils/date';

/**
 * End-to-end flow across the data layer and the domain engine: create a plan,
 * make it the default, log a few days, then project the finish date.
 */
describe('memorization flow', () => {
  it('creates a default plan, logs progress, and projects a finish date', async () => {
    let counter = 0;
    const repos = createMemoryRepositories(() => `id-${(counter += 1)}`);

    const dailyTarget = dailyTargetFor('100-days');
    expect(dailyTarget).toBe(63);

    const created = await repos.plans.create({
      name: 'My Hifz',
      templateId: '100-days',
      startDate: '2025-01-01',
      dailyTarget,
      templateSnapshot: getTemplate('100-days'),
    });
    await repos.plans.setDefault(created.id);

    const defaultPlan = await repos.plans.getDefault();
    expect(defaultPlan?.id).toBe(created.id);
    expect(defaultPlan?.isDefault).toBe(true);

    await repos.progress.upsert({
      planId: created.id,
      date: '2025-01-01',
      status: 'full',
      verses: versesForStatus('full', dailyTarget),
    });
    await repos.progress.upsert({
      planId: created.id,
      date: '2025-01-02',
      status: 'partial',
      verses: versesForStatus('partial', dailyTarget, 30),
    });
    await repos.progress.upsert({
      planId: created.id,
      date: '2025-01-03',
      status: 'missed',
      verses: versesForStatus('missed', dailyTarget),
    });

    const entries = await repos.progress.listByPlan(created.id);
    const plan = await repos.plans.get(created.id);
    const projection = computeProjection(plan!, entries, '2025-01-03');

    expect(projection.totalMemorized).toBe(93);
    expect(projection.loggedDays).toBe(3);
    expect(projection.elapsedDays).toBe(daysInclusive('2025-01-01', '2025-01-03'));
    expect(projection.ratePerDay).toBeCloseTo(31);
    expect(projection.position).toEqual(positionAtIndex(93));
    expect(projection.projectedFinishDate).toBe(addDays('2025-01-03', Math.ceil((6236 - 93) / 31)));
    // Pace (31/day) is below the 63/day target, so we are behind schedule.
    expect(projection.daysAheadOfTarget).not.toBeNull();
    expect(projection.daysAheadOfTarget!).toBeLessThan(0);
  });

  it('updates the same day instead of duplicating entries', async () => {
    const repos = createMemoryRepositories(() => 'fixed');
    const plan = await repos.plans.create({
      name: 'P',
      templateId: '1-year',
      startDate: '2025-01-01',
      dailyTarget: 18,
      templateSnapshot: getTemplate('1-year'),
    });

    await repos.progress.upsert({ planId: plan.id, date: '2025-01-01', status: 'full', verses: 18 });
    await repos.progress.upsert({ planId: plan.id, date: '2025-01-01', status: 'partial', verses: 5 });

    const entries = await repos.progress.listByPlan(plan.id);
    expect(entries).toHaveLength(1);
    expect(entries[0].verses).toBe(5);
    expect(entries[0].status).toBe('partial');
  });

  it('changing the template keeps memorized verses but recomputes cadence and target', async () => {
    let counter = 0;
    const repos = createMemoryRepositories(() => `id-${(counter += 1)}`);
    const plan = await repos.plans.create({
      name: 'P',
      templateId: '100-days',
      startDate: '2025-01-01',
      dailyTarget: dailyTargetFor('100-days'),
      templateSnapshot: getTemplate('100-days'),
    });

    // Three "full" days credited at the 100-day target (63/day).
    for (const date of ['2025-01-01', '2025-01-02', '2025-01-03']) {
      await repos.progress.upsert({
        planId: plan.id,
        date,
        status: 'full',
        verses: versesForStatus('full', dailyTargetFor('100-days')),
      });
    }

    const before = computeProjection(
      (await repos.plans.get(plan.id))!,
      await repos.progress.listByPlan(plan.id),
      '2025-01-03',
    );
    expect(before.totalMemorized).toBe(189);
    expect(before.targetFinishDate).toBe(addDays('2025-01-01', 99));

    // Move to the 1-year template, keeping memorized verses (snapshot updated too).
    await repos.plans.update(plan.id, {
      templateId: '1-year',
      dailyTarget: dailyTargetFor('1-year'),
      templateSnapshot: getTemplate('1-year'),
    });

    const changedPlan = (await repos.plans.get(plan.id))!;
    const entries = await repos.progress.listByPlan(plan.id);
    const after = computeProjection(changedPlan, entries, '2025-01-03');

    // Daily goal recomputed for the new cadence.
    expect(changedPlan.dailyTarget).toBe(18);
    // Verses already memorized are preserved (history not rewritten).
    expect(after.totalMemorized).toBe(189);
    expect(after.position).toEqual(before.position);
    expect(entries.every((e) => e.verses === 63)).toBe(true);
    // Target date now reflects the 1-year (365-day) cadence.
    expect(after.targetFinishDate).toBe(addDays('2025-01-01', 364));
    expect(after.targetFinishDate).not.toBe(before.targetFinishDate);
    // Pace (63/day) now far exceeds the 18/day goal, so we are ahead.
    expect(after.daysAheadOfTarget!).toBeGreaterThan(0);
  });
});
