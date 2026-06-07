import {
  PLAN_EXPORT_FORMAT,
  PLAN_EXPORT_VERSION,
  parsePlanExport,
  serializePlan,
} from '../planTransfer';
import { getTemplate } from '../templates';
import { userScheduleToTemplate } from '../userSchedule';
import { CadenceTemplate, Plan, ProgressEntry, UserSchedule } from '../types';

function makePlan(snapshot: CadenceTemplate, over: Partial<Plan> = {}): Plan {
  return {
    id: 'plan-1',
    name: 'My Plan',
    templateId: snapshot.id,
    startDate: '2025-01-01',
    dailyTarget: snapshot.dailyTarget,
    templateSnapshot: snapshot,
    isDefault: true,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-02T00:00:00Z',
    ...over,
  };
}

function entry(date: string, verses: number, status: ProgressEntry['status'] = 'full'): ProgressEntry {
  return {
    id: `e-${date}`,
    planId: 'plan-1',
    date,
    status,
    verses,
    createdAt: `${date}T00:00:00Z`,
    updatedAt: `${date}T00:00:00Z`,
  };
}

const userSchedule: UserSchedule = {
  id: 'user-123',
  name: 'My Custom',
  source: 'my-custom.csv',
  days: [
    { day: 1, phase: 1, isReview: false, from: { surah: 1, ayah: 1 }, to: { surah: 1, ayah: 7 } },
    { day: 2, phase: 1, isReview: false, from: { surah: 2, ayah: 1 }, to: { surah: 2, ayah: 20 } },
  ],
  createdAt: '2025-01-01T00:00:00Z',
};

describe('serializePlan / parsePlanExport', () => {
  it('round-trips a computed plan with entries', () => {
    const plan = makePlan(getTemplate('100-days'));
    const entries = [entry('2025-01-01', 63), entry('2025-01-02', 20, 'partial')];

    const parsed = parsePlanExport(serializePlan(plan, entries));

    expect(parsed.name).toBe('My Plan');
    expect(parsed.templateId).toBe('100-days');
    expect(parsed.startDate).toBe('2025-01-01');
    expect(parsed.dailyTarget).toBe(63);
    expect(parsed.templateSnapshot.id).toBe('100-days');
    expect(parsed.entries).toEqual([
      { date: '2025-01-01', status: 'full', verses: 63 },
      { date: '2025-01-02', status: 'partial', verses: 20 },
    ]);
  });

  it('preserves a user-defined plan’s embedded schedule', () => {
    const snapshot = userScheduleToTemplate(userSchedule);
    const plan = makePlan(snapshot);

    const parsed = parsePlanExport(serializePlan(plan, []));

    expect(parsed.templateSnapshot.userDefined).toBe(true);
    expect(parsed.templateSnapshot.source).toBe('my-custom.csv');
    expect(parsed.templateSnapshot.schedule).toHaveLength(2);
    expect(parsed.templateSnapshot.schedule?.[1].to).toEqual({ surah: 2, ayah: 20, page: undefined });
  });

  it('writes the format and version markers', () => {
    const plan = makePlan(getTemplate('1-year'));
    const json = JSON.parse(serializePlan(plan, []));
    expect(json.format).toBe(PLAN_EXPORT_FORMAT);
    expect(json.version).toBe(PLAN_EXPORT_VERSION);
  });

  it('rejects a non-JSON file', () => {
    expect(() => parsePlanExport('not json {')).toThrow(/not valid JSON/);
  });

  it('rejects a foreign format', () => {
    expect(() => parsePlanExport(JSON.stringify({ format: 'something-else', version: 1 }))).toThrow(
      /not a Quran Tracker plan export/,
    );
  });

  it('rejects an unsupported version', () => {
    const plan = makePlan(getTemplate('100-days'));
    const obj = JSON.parse(serializePlan(plan, []));
    obj.version = 99;
    expect(() => parsePlanExport(JSON.stringify(obj))).toThrow(/Unsupported export version/);
  });

  it('rejects an invalid entry status', () => {
    const plan = makePlan(getTemplate('100-days'));
    const obj = JSON.parse(serializePlan(plan, [entry('2025-01-01', 10)]));
    obj.entries[0].status = 'done';
    expect(() => parsePlanExport(JSON.stringify(obj))).toThrow(/invalid status/);
  });

  it('rejects an invalid entry date', () => {
    const plan = makePlan(getTemplate('100-days'));
    const obj = JSON.parse(serializePlan(plan, [entry('2025-01-01', 10)]));
    obj.entries[0].date = '2025-13-40';
    expect(() => parsePlanExport(JSON.stringify(obj))).toThrow(/invalid date/);
  });

  it('rejects a missing template snapshot', () => {
    const plan = makePlan(getTemplate('100-days'));
    const obj = JSON.parse(serializePlan(plan, []));
    delete obj.plan.templateSnapshot;
    expect(() => parsePlanExport(JSON.stringify(obj))).toThrow(/template details/);
  });
});
