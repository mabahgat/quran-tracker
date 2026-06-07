import { AppEvent, EventDetails, EventType, Plan, ProgressStatus, TemplateId } from './types';

/** A new event before the repository assigns an id and timestamp. */
export interface EventDraft {
  type: EventType;
  planId: string | null;
  planName: string;
  details: EventDetails;
}

export function planCreatedEvent(plan: Plan): EventDraft {
  return {
    type: 'plan_created',
    planId: plan.id,
    planName: plan.name,
    details: { templateId: plan.templateId },
  };
}

export function planRenamedEvent(plan: Plan, from: string, to: string): EventDraft {
  return {
    type: 'plan_renamed',
    planId: plan.id,
    planName: to,
    details: { from, to },
  };
}

export function planTemplateChangedEvent(
  plan: Plan,
  fromTemplateId: TemplateId,
  toTemplateId: TemplateId,
): EventDraft {
  return {
    type: 'plan_template_changed',
    planId: plan.id,
    planName: plan.name,
    details: { fromTemplateId, toTemplateId },
  };
}

export function planSetDefaultEvent(plan: Plan): EventDraft {
  return {
    type: 'plan_set_default',
    planId: plan.id,
    planName: plan.name,
    details: {},
  };
}

export function planDeletedEvent(plan: Plan): EventDraft {
  return {
    type: 'plan_deleted',
    planId: plan.id,
    planName: plan.name,
    details: { templateId: plan.templateId },
  };
}

export function progressLoggedEvent(
  plan: Plan,
  status: ProgressStatus,
  verses: number,
  date: string,
): EventDraft {
  return {
    type: 'progress_logged',
    planId: plan.id,
    planName: plan.name,
    details: { status, verses, date },
  };
}

/** Most recent first; ties broken by id so ordering is stable in tests. */
export function sortEventsDesc(events: readonly AppEvent[]): AppEvent[] {
  return [...events].sort((a, b) => {
    if (a.createdAt !== b.createdAt) {
      return a.createdAt < b.createdAt ? 1 : -1;
    }
    return a.id < b.id ? 1 : -1;
  });
}
