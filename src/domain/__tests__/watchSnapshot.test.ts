import { buildWatchSnapshot, parseWatchLogMessage } from '../watchSnapshot';

describe('buildWatchSnapshot', () => {
  it('fills defaults and is plist-safe (no null/undefined)', () => {
    const snap = buildWatchSnapshot({ hasPlan: false, now: new Date('2025-01-01T00:00:00Z') });
    expect(snap.v).toBe(1);
    expect(snap.hasPlan).toBe(false);
    expect(snap.planName).toBe('');
    expect(snap.upToLabel).toBe('');
    expect(snap.todayStatus).toBe('');
    expect(snap.updatedAt).toBe('2025-01-01T00:00:00.000Z');
    for (const value of Object.values(snap)) {
      expect(value).not.toBeNull();
      expect(value).not.toBeUndefined();
    }
  });

  it('clamps and rounds the percentage', () => {
    expect(buildWatchSnapshot({ hasPlan: true, percent: -5 }).percent).toBe(0);
    expect(buildWatchSnapshot({ hasPlan: true, percent: 142 }).percent).toBe(100);
    expect(buildWatchSnapshot({ hasPlan: true, percent: 33.6 }).percent).toBe(34);
  });

  it('passes through the plan summary', () => {
    const snap = buildWatchSnapshot({
      hasPlan: true,
      planName: 'My Plan',
      dailyGoal: 12,
      goalLabel: '12 verses',
      upToLabel: 'Al-Baqarah (2) : 5',
      todayStatus: 'partial',
      statusLabel: 'Partial',
      projectionLabel: '3 days ahead',
      percent: 25,
    });
    expect(snap.planName).toBe('My Plan');
    expect(snap.dailyGoal).toBe(12);
    expect(snap.todayStatus).toBe('partial');
    expect(snap.projectionLabel).toBe('3 days ahead');
  });
});

describe('parseWatchLogMessage', () => {
  it('accepts valid log actions', () => {
    expect(parseWatchLogMessage({ type: 'log', status: 'full' })).toEqual({
      type: 'log',
      status: 'full',
      verses: 0,
    });
    expect(parseWatchLogMessage({ type: 'log', status: 'partial', verses: 7 })).toEqual({
      type: 'log',
      status: 'partial',
      verses: 7,
    });
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
