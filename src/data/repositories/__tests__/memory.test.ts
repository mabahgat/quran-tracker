import { getTemplate } from '../../../domain/templates';
import { TemplateId } from '../../../domain/types';
import { createMemoryRepositories } from '../memory';
import { NewPlan, Repositories } from '../types';

function makeRepos(): Repositories {
  let counter = 0;
  return createMemoryRepositories(() => `id-${(counter += 1)}`);
}

function planInput(over: { name: string; templateId: TemplateId; startDate?: string }): NewPlan {
  const template = getTemplate(over.templateId);
  return {
    name: over.name,
    templateId: over.templateId,
    startDate: over.startDate ?? '2025-01-01',
    dailyTarget: template.dailyTarget,
    templateSnapshot: template,
  };
}

describe('memory repositories', () => {
  it('creates and lists plans', async () => {
    const repos = makeRepos();
    const plan = await repos.plans.create(planInput({ name: 'My Hifz', templateId: '1-year' }));

    expect(plan.id).toBe('id-1');
    expect(plan.isDefault).toBe(false);
    expect(plan.templateSnapshot.durationDays).toBe(365);
    expect(await repos.plans.list()).toHaveLength(1);
    expect(await repos.plans.get(plan.id)).toEqual(plan);
  });

  it('enforces a single default plan', async () => {
    const repos = makeRepos();
    const a = await repos.plans.create(planInput({ name: 'A', templateId: '100-days' }));
    const b = await repos.plans.create(planInput({ name: 'B', templateId: '2-years' }));

    await repos.plans.setDefault(a.id);
    expect((await repos.plans.getDefault())?.id).toBe(a.id);

    await repos.plans.setDefault(b.id);
    const def = await repos.plans.getDefault();
    expect(def?.id).toBe(b.id);
    expect((await repos.plans.get(a.id))?.isDefault).toBe(false);
  });

  it('updates plan fields', async () => {
    const repos = makeRepos();
    const plan = await repos.plans.create(planInput({ name: 'Old', templateId: '100-days' }));
    const updated = await repos.plans.update(plan.id, {
      name: 'New',
      templateId: '6-months',
      dailyTarget: 35,
      templateSnapshot: getTemplate('6-months'),
    });

    expect(updated.name).toBe('New');
    expect(updated.templateId).toBe('6-months');
    expect(updated.dailyTarget).toBe(35);
    expect(updated.templateSnapshot.id).toBe('6-months');
  });

  it('upserts progress entries by date', async () => {
    const repos = makeRepos();
    const plan = await repos.plans.create(planInput({ name: 'P', templateId: '100-days' }));

    const first = await repos.progress.upsert({ planId: plan.id, date: '2025-01-01', status: 'full', verses: 63 });
    expect(first.verses).toBe(63);

    const second = await repos.progress.upsert({ planId: plan.id, date: '2025-01-01', status: 'partial', verses: 20 });
    expect(second.id).toBe(first.id);
    expect(second.verses).toBe(20);

    const entries = await repos.progress.listByPlan(plan.id);
    expect(entries).toHaveLength(1);
    expect(entries[0].status).toBe('partial');
  });

  it('removes progress for a plan', async () => {
    const repos = makeRepos();
    const plan = await repos.plans.create(planInput({ name: 'P', templateId: '100-days' }));
    await repos.progress.upsert({ planId: plan.id, date: '2025-01-01', status: 'full', verses: 63 });
    await repos.progress.upsert({ planId: plan.id, date: '2025-01-02', status: 'full', verses: 63 });

    await repos.progress.removeByPlan(plan.id);
    expect(await repos.progress.listByPlan(plan.id)).toHaveLength(0);
  });

  it('stores and reads settings', async () => {
    const repos = makeRepos();
    await repos.settings.set('language', 'ar');
    expect(await repos.settings.get('language')).toBe('ar');
    await repos.settings.set('language', 'en');
    expect(await repos.settings.get('language')).toBe('en');
    expect(await repos.settings.all()).toEqual({ language: 'en' });
  });

  it('records events and lists them most-recent-first', async () => {
    const repos = makeRepos();
    await repos.events.add({ type: 'plan_created', planId: 'p1', planName: 'A', details: {} });
    await repos.events.add({
      type: 'progress_logged',
      planId: 'p1',
      planName: 'A',
      details: { status: 'full', verses: 63, date: '2025-01-01' },
    });

    const all = await repos.events.list();
    expect(all).toHaveLength(2);
    // newest first (the progress_logged was added last)
    expect(all[0].type).toBe('progress_logged');
    expect(all[0].details).toEqual({ status: 'full', verses: 63, date: '2025-01-01' });
    expect(all[1].type).toBe('plan_created');

    const capped = await repos.events.list(1);
    expect(capped).toHaveLength(1);
    expect(capped[0].type).toBe('progress_logged');
  });

  it('keeps events after the related plan is deleted', async () => {
    const repos = makeRepos();
    const plan = await repos.plans.create(planInput({ name: 'Temp', templateId: '100-days' }));
    await repos.events.add({
      type: 'plan_deleted',
      planId: plan.id,
      planName: plan.name,
      details: {},
    });
    await repos.plans.remove(plan.id);

    const all = await repos.events.list();
    expect(all).toHaveLength(1);
    expect(all[0].planName).toBe('Temp');
    expect(await repos.plans.get(plan.id)).toBeNull();
  });

  it('lists events for a single plan, most recent first', async () => {
    const repos = makeRepos();
    await repos.events.add({ type: 'plan_created', planId: 'p1', planName: 'A', details: {} });
    await repos.events.add({ type: 'plan_created', planId: 'p2', planName: 'B', details: {} });
    await repos.events.add({
      type: 'progress_logged',
      planId: 'p1',
      planName: 'A',
      details: { status: 'full', verses: 63, date: '2025-01-01' },
    });

    const p1 = await repos.events.listByPlan('p1');
    expect(p1).toHaveLength(2);
    expect(p1.every((e) => e.planId === 'p1')).toBe(true);
    expect(p1[0].type).toBe('progress_logged');

    expect(await repos.events.listByPlan('p2')).toHaveLength(1);
    expect(await repos.events.listByPlan('p1', 1)).toHaveLength(1);
    expect(await repos.events.listByPlan('missing')).toHaveLength(0);
  });

  it('removes a single event and clears the whole log', async () => {
    const repos = makeRepos();
    const a = await repos.events.add({ type: 'plan_created', planId: 'p1', planName: 'A', details: {} });
    await repos.events.add({ type: 'plan_set_default', planId: 'p1', planName: 'A', details: {} });
    expect(await repos.events.list()).toHaveLength(2);

    await repos.events.remove(a.id);
    const afterRemove = await repos.events.list();
    expect(afterRemove).toHaveLength(1);
    expect(afterRemove.some((e) => e.id === a.id)).toBe(false);

    await repos.events.clear();
    expect(await repos.events.list()).toHaveLength(0);
  });

  it('creates, lists and removes user schedules', async () => {
    const repos = makeRepos();
    const days = [
      { day: 1, phase: 1, isReview: false, from: { surah: 1, ayah: 1 }, to: { surah: 1, ayah: 7 } },
    ];
    const created = await repos.userSchedules.create({ name: 'Mine', source: 'mine.csv', days });
    expect(created.id).toBe('id-1');
    expect(created.days).toHaveLength(1);

    expect(await repos.userSchedules.list()).toHaveLength(1);
    expect((await repos.userSchedules.get(created.id))?.name).toBe('Mine');

    await repos.userSchedules.remove(created.id);
    expect(await repos.userSchedules.list()).toHaveLength(0);
    expect(await repos.userSchedules.get(created.id)).toBeNull();
  });
});
