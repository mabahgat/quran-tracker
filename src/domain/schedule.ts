import { positionAtIndex, TOTAL_AYAH } from './quran';
import { getTemplate } from './templates';
import { QuranPosition, TemplateId } from './types';
import { addDays } from '../utils/date';

export interface ScheduleDay {
  day: number;
  date: string;
  startPosition: QuranPosition;
  endPosition: QuranPosition;
  versesThisDay: number;
  cumulative: number;
}

export interface ScheduleSummary {
  templateId: TemplateId;
  startDate: string;
  finishDate: string;
  totalDays: number;
  nominalDays: number;
  dailyTarget: number;
  totalVerses: number;
  days: ScheduleDay[];
}

export interface ScheduleParams {
  templateId: TemplateId;
  dailyTarget: number;
  nominalDays: number;
  startDate: string;
}

/**
 * Builds the full day-by-day memorization schedule from an explicit cadence.
 * Each day covers `dailyTarget` verses (the last day may be shorter) mapped
 * forward from Al-Fatihah (1:1). The schedule ends on the day the whole Quran is
 * completed, which can be slightly fewer than `nominalDays` because the daily
 * target is rounded up. Using explicit params (rather than looking up the live
 * template) lets a stored plan render the schedule from its frozen snapshot.
 */
export function generateScheduleFrom(params: ScheduleParams): ScheduleSummary {
  const { templateId, dailyTarget, nominalDays, startDate } = params;
  const days: ScheduleDay[] = [];

  let cumulative = 0;
  let day = 0;
  while (cumulative < TOTAL_AYAH) {
    day += 1;
    const previous = cumulative;
    cumulative = Math.min(previous + dailyTarget, TOTAL_AYAH);
    days.push({
      day,
      date: addDays(startDate, day - 1),
      startPosition: positionAtIndex(previous + 1),
      endPosition: positionAtIndex(cumulative),
      versesThisDay: cumulative - previous,
      cumulative,
    });
  }

  return {
    templateId,
    startDate,
    finishDate: days.length > 0 ? days[days.length - 1].date : startDate,
    totalDays: days.length,
    nominalDays,
    dailyTarget,
    totalVerses: TOTAL_AYAH,
    days,
  };
}

/** Convenience wrapper that builds the schedule from the live template resource. */
export function generateSchedule(templateId: TemplateId, startDate: string): ScheduleSummary {
  const template = getTemplate(templateId);
  return generateScheduleFrom({
    templateId,
    dailyTarget: template.dailyTarget,
    nominalDays: template.durationDays,
    startDate,
  });
}
