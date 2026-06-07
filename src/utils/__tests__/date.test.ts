import { addDays, daysInclusive, diffDays, parseISODate, todayISO, toISODate } from '../date';

describe('date utilities', () => {
  it('adds days across month and year boundaries', () => {
    expect(addDays('2025-01-01', 1)).toBe('2025-01-02');
    expect(addDays('2025-01-31', 1)).toBe('2025-02-01');
    expect(addDays('2025-12-31', 1)).toBe('2026-01-01');
    expect(addDays('2025-01-10', -9)).toBe('2025-01-01');
  });

  it('handles leap years', () => {
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
    expect(addDays('2023-02-28', 1)).toBe('2023-03-01');
  });

  it('computes day differences', () => {
    expect(diffDays('2025-01-01', '2025-01-11')).toBe(10);
    expect(diffDays('2025-01-11', '2025-01-01')).toBe(-10);
    expect(daysInclusive('2025-01-01', '2025-01-01')).toBe(1);
    expect(daysInclusive('2025-01-01', '2025-01-10')).toBe(10);
  });

  it('formats today using local date parts', () => {
    expect(todayISO(new Date(2025, 0, 5, 23, 30))).toBe('2025-01-05');
    expect(todayISO(new Date(2025, 11, 9, 1, 0))).toBe('2025-12-09');
  });

  it('parses and formats round-trip', () => {
    expect(toISODate(parseISODate('2025-06-06'))).toBe('2025-06-06');
  });
});
