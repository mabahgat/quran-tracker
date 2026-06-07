import { buildExplicitSchedule } from './explicitSchedule';
import { TOTAL_AYAH } from './quran';
import { CadenceTemplate, ExplicitSchedule, UserSchedule } from './types';

/**
 * Derives the picker-facing template definition from a saved user schedule. The
 * display name is identical in both languages (the user named it once) and the
 * day-by-day timetable is embedded so a plan can snapshot it.
 */
export function userScheduleToTemplate(schedule: UserSchedule): CadenceTemplate {
  const durationDays = Math.max(1, schedule.days.length);
  return {
    id: schedule.id,
    kind: 'scheduled',
    names: { en: schedule.name, ar: schedule.name },
    durationDays,
    dailyTarget: Math.max(1, Math.ceil(TOTAL_AYAH / durationDays)),
    totalVerses: TOTAL_AYAH,
    userDefined: true,
    source: schedule.source,
    schedule: schedule.days,
  };
}

/** Builds the explicit timetable used for the daily goal and the schedule view. */
export function userScheduleToExplicit(schedule: UserSchedule): ExplicitSchedule {
  return buildExplicitSchedule(schedule.id, schedule.source, schedule.days);
}
