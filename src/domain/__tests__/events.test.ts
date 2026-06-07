import {
  planCreatedEvent,
  planDeletedEvent,
  planRenamedEvent,
  planSetDefaultEvent,
  planTemplateChangedEvent,
  progressDeletedEvent,
  progressLoggedEvent,
  sortEventsDesc,
} from '../events';
import { getTemplate } from '../templates';
import { AppEvent, Plan } from '../types';

function makePlan(over: Partial<Plan> = {}): Plan {
  return {
    id: 'plan-1',
    name: 'My Hifz',
    templateId: '100-days',
    startDate: '2025-01-01',
    dailyTarget: 63,
    templateSnapshot: getTemplate('100-days'),
    isDefault: false,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    ...over,
  };
}

describe('event factories', () => {
  const plan = makePlan();

  it('builds a plan_created event', () => {
    expect(planCreatedEvent(plan)).toEqual({
      type: 'plan_created',
      planId: 'plan-1',
      planName: 'My Hifz',
      details: { templateId: '100-days' },
    });
  });

  it('builds a plan_renamed event carrying both names', () => {
    const event = planRenamedEvent(makePlan({ name: 'New' }), 'Old', 'New');
    expect(event.type).toBe('plan_renamed');
    expect(event.planName).toBe('New');
    expect(event.details).toEqual({ from: 'Old', to: 'New' });
  });

  it('builds a plan_template_changed event', () => {
    const event = planTemplateChangedEvent(plan, '100-days', '1-year');
    expect(event.details).toEqual({ fromTemplateId: '100-days', toTemplateId: '1-year' });
  });

  it('builds set-default and deleted events', () => {
    expect(planSetDefaultEvent(plan).type).toBe('plan_set_default');
    expect(planDeletedEvent(plan).type).toBe('plan_deleted');
  });

  it('builds a progress_logged event with status, verses and date', () => {
    const event = progressLoggedEvent(plan, 'partial', 20, '2025-01-02');
    expect(event.type).toBe('progress_logged');
    expect(event.details).toEqual({ status: 'partial', verses: 20, date: '2025-01-02' });
  });

  it('builds a progress_deleted event carrying the date', () => {
    const event = progressDeletedEvent(plan, '2025-01-02');
    expect(event.type).toBe('progress_deleted');
    expect(event.planId).toBe('plan-1');
    expect(event.details).toEqual({ date: '2025-01-02' });
  });
});

describe('sortEventsDesc', () => {
  const ev = (id: string, createdAt: string): AppEvent => ({
    id,
    type: 'plan_set_default',
    planId: 'p',
    planName: 'p',
    details: {},
    createdAt,
  });

  it('orders most recent first', () => {
    const sorted = sortEventsDesc([
      ev('a', '2025-01-01T10:00:00Z'),
      ev('b', '2025-01-03T10:00:00Z'),
      ev('c', '2025-01-02T10:00:00Z'),
    ]);
    expect(sorted.map((e) => e.id)).toEqual(['b', 'c', 'a']);
  });

  it('breaks ties by id deterministically', () => {
    const sorted = sortEventsDesc([
      ev('a', '2025-01-01T10:00:00Z'),
      ev('b', '2025-01-01T10:00:00Z'),
    ]);
    expect(sorted.map((e) => e.id)).toEqual(['b', 'a']);
  });
});
