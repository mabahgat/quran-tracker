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
});
