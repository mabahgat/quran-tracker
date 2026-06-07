import { getExplicitSchedule } from './explicitSchedule';
import { generateScheduleFrom } from './schedule';
import { CadenceTemplate, ExplicitScheduleDay } from './types';
import { todayISO } from '../utils/date';

/**
 * The day-by-day timetable for any template, ready for CSV export:
 * - user-defined or future embedded schedules use their stored days,
 * - built-in scheduled templates use their expert resource schedule,
 * - computed templates are expanded from their flat daily target.
 */
export function templateScheduleDays(template: CadenceTemplate): ExplicitScheduleDay[] {
  if (template.schedule && template.schedule.length > 0) {
    return template.schedule;
  }
  const explicit = getExplicitSchedule(template.id);
  if (explicit) {
    return explicit.days;
  }
  const summary = generateScheduleFrom({
    templateId: template.id,
    dailyTarget: template.dailyTarget,
    nominalDays: template.durationDays,
    startDate: todayISO(),
  });
  return summary.days.map((day) => ({
    day: day.day,
    phase: 1,
    isReview: false,
    from: day.startPosition,
    to: day.endPosition,
  }));
}
