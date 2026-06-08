import {
  buildWatchPayload,
  buildWatchPlanEntry,
  parseWatchLogMessage,
} from '../watchSnapshot';

describe('buildWatchPlanEntry', () => {
  it('fills defaults and is plist-safe (no null/undefined)', () => {
    const entry = buildWatchPlanEntry({ id: 'p1' });
    expect(entry.id).toBe('p1');
    expect(entry.isDefault).toBe(false);
    expect(entry.planName).toBe('');
    expect(entry.upToLabel).toBe('');
    expect(entry.todayStatus).toBe('');
    for (const value of Object.values(entry)) {
      expect(value).not.toBeNull();
      expect(value).not.toBeUndefined();
    }
  });

  it('clamps and rounds the percentage', () => {
    expect(buildWatchPlanEntry({ id: 'p', percent: -5 }).percent).toBe(0);
    expect(buildWatchPlanEntry({ id: 'p', percent: 142 }).percent).toBe(100);
    expect(buildWatchPlanEntry({ id: 'p', percent: 33.6 }).percent).toBe(34);
  });

  it('passes through the plan summary', () => {
    const entry = buildWatchPlanEntry({
      id: 'p2',
      isDefault: true,
      planName: 'My Plan',
      dailyGoal: 12,
      goalLabel: '12 verses',
      upToLabel: 'Al-Baqarah (2) : 5',
      todayStatus: 'partial',
      statusLabel: 'Partial',
      projectionLabel: '3 days ahead',
      percent: 25,
    });
    expect(entry.isDefault).toBe(true);
    expect(entry.planName).toBe('My Plan');
    expect(entry.dailyGoal).toBe(12);
    expect(entry.todayStatus).toBe('partial');
    expect(entry.projectionLabel).toBe('3 days ahead');
  });
});

describe('buildWatchPayload', () => {
  it('reports hasPlan false and is plist-safe when empty', () => {
    const payload = buildWatchPayload({ now: new Date('2025-01-01T00:00:00Z') });
    expect(payload.v).toBe(1);
    expect(payload.hasPlan).toBe(false);
    expect(payload.plans).toEqual([]);
    expect(payload.defaultIndex).toBe(0);
    expect(payload.updatedAt).toBe('2025-01-01T00:00:00.000Z');
  });

  it('carries all plans and the default index', () => {
    const payload = buildWatchPayload({
      language: 'ar',
      defaultIndex: 1,
      plans: [buildWatchPlanEntry({ id: 'a' }), buildWatchPlanEntry({ id: 'b', isDefault: true })],
    });
    expect(payload.hasPlan).toBe(true);
    expect(payload.language).toBe('ar');
    expect(payload.defaultIndex).toBe(1);
    expect(payload.plans.map((p) => p.id)).toEqual(['a', 'b']);
  });

  it('clamps an out-of-range default index to 0', () => {
    const payload = buildWatchPayload({
      defaultIndex: 9,
      plans: [buildWatchPlanEntry({ id: 'a' })],
    });
    expect(payload.defaultIndex).toBe(0);
  });
});

describe('parseWatchLogMessage', () => {
  it('accepts valid log actions and reads the plan id', () => {
    expect(parseWatchLogMessage({ type: 'log', planId: 'p1', status: 'full' })).toEqual({
      type: 'log',
      planId: 'p1',
      status: 'full',
      verses: 0,
    });
    expect(parseWatchLogMessage({ type: 'log', planId: 'p2', status: 'partial', verses: 7 })).toEqual({
      type: 'log',
      planId: 'p2',
      status: 'partial',
      verses: 7,
    });
  });

  it('defaults a missing plan id to empty string', () => {
    expect(parseWatchLogMessage({ type: 'log', status: 'missed' })?.planId).toBe('');
  });

  it('floors and guards the verse count', () => {
    expect(parseWatchLogMessage({ type: 'log', status: 'partial', verses: 7.9 })?.verses).toBe(7);
    expect(parseWatchLogMessage({ type: 'log', status: 'partial', verses: -3 })?.verses).toBe(0);
  });

  it('rejects malformed messages', () => {
    expect(parseWatchLogMessage(null)).toBeNull();
    expect(parseWatchLogMessage({ type: 'ping' })).toBeNull();
    expect(parseWatchLogMessage({ type: 'log', status: 'done' })).toBeNull();
    expect(parseWatchLogMessage('log')).toBeNull();
  });
});
