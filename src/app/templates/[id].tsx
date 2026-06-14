import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { SectionList, StyleSheet, View } from 'react-native';

import { Badge } from '@/components/Badge';
import { Card } from '@/components/Card';
import { ExplicitScheduleView } from '@/components/ExplicitScheduleView';
import { InfoRow } from '@/components/InfoRow';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { buildExplicitSchedule, getExplicitSchedule } from '@/domain/explicitSchedule';
import { generateSchedule, generateScheduleFrom, ScheduleDay } from '@/domain/schedule';
import { TemplateId } from '@/domain/types';
import { useDirection } from '@/hooks/use-direction';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/state/AppProvider';
import { todayISO } from '@/utils/date';
import { directionalArrow, formatPosition } from '@/utils/format';

interface Section {
  title: string;
  data: ScheduleDay[];
}

export default function TemplateScheduleScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { textAlign, flexRow, language, isRTL } = useDirection();
  const { templates, userSchedules, templateLabel } = useApp();
  const params = useLocalSearchParams<{ id: string; start?: string; target?: string; duration?: string }>();

  const templateId = (templates.find((tpl) => tpl.id === params.id)?.id ?? null) as TemplateId | null;
  const startDate = params.start ?? todayISO();
  const target = params.target ? parseInt(params.target, 10) : NaN;
  const duration = params.duration ? parseInt(params.duration, 10) : NaN;

  const explicit = useMemo(() => {
    if (!templateId) return null;
    const builtIn = getExplicitSchedule(templateId);
    if (builtIn) return builtIn;
    const userSchedule = userSchedules.find((u) => u.id === templateId);
    return userSchedule
      ? buildExplicitSchedule(userSchedule.id, userSchedule.source, userSchedule.days)
      : null;
  }, [templateId, userSchedules]);

  const schedule = useMemo(() => {
    if (!templateId || explicit) return null;
    if (Number.isFinite(target) && target > 0 && Number.isFinite(duration) && duration > 0) {
      return generateScheduleFrom({ templateId, dailyTarget: target, nominalDays: duration, startDate });
    }
    return generateSchedule(templateId, startDate);
  }, [templateId, explicit, startDate, target, duration]);

  const sections = useMemo<Section[]>(() => {
    if (!schedule) return [];
    const result: Section[] = [];
    let current: Section | null = null;
    for (const day of schedule.days) {
      const month = day.date.slice(0, 7);
      if (!current || current.title !== month) {
        current = { title: month, data: [] };
        result.push(current);
      }
      current.data.push(day);
    }
    return result;
  }, [schedule]);

  if (!templateId) {
    return (
      <View style={[styles.fallback, { backgroundColor: theme.background }]}>
        <ThemedText style={{ color: theme.textSecondary }}>{t('settings.noPlans')}</ThemedText>
      </View>
    );
  }

  if (explicit) {
    return <ExplicitScheduleView schedule={explicit} templateId={templateId} startDate={startDate} />;
  }

  if (!schedule) {
    return (
      <View style={[styles.fallback, { backgroundColor: theme.background }]}>
        <ThemedText style={{ color: theme.textSecondary }}>{t('settings.noPlans')}</ThemedText>
      </View>
    );
  }

  const arrow = directionalArrow(isRTL);

  const header = (
    <Card style={styles.summary}>
      <View style={[styles.summaryTop, { flexDirection: flexRow }]}>
        <Badge tone="primary" label={templateLabel(templateId)} />
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          {t('schedule.perDay', { n: schedule.dailyTarget })}
        </ThemedText>
      </View>
      <InfoRow label={t('schedule.startDate')} value={schedule.startDate} />
      <InfoRow label={t('schedule.finishDate')} value={schedule.finishDate} emphasize />
      <InfoRow label={t('schedule.totalDays')} value={String(schedule.totalDays)} />
      <ThemedText type="small" style={{ textAlign, color: theme.textSecondary }}>
        {t('schedule.completionNote', { days: schedule.totalDays, nominal: schedule.nominalDays })}
      </ThemedText>
    </Card>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => String(item.day)}
        ListHeaderComponent={header}
        contentContainerStyle={styles.content}
        stickySectionHeadersEnabled={false}
        initialNumToRender={20}
        renderSectionHeader={({ section }) => (
          <View
            style={[styles.sectionHeader, { flexDirection: flexRow, backgroundColor: theme.background }]}>
            <ThemedText type="smallBold" style={{ color: theme.primary, textAlign }}>
              {section.title}
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              {t('schedule.monthDays', { n: section.data.length })}
            </ThemedText>
          </View>
        )}
        renderItem={({ item }) => (
          <View style={[styles.dayRow, { borderColor: theme.border }]}>
            <View style={[styles.dayTop, { flexDirection: flexRow }]}>
              <ThemedText type="smallBold" style={{ textAlign }}>
                {t('schedule.dayLabel', { n: item.day })}
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                {item.date}
              </ThemedText>
            </View>
            <View style={[styles.range, { flexDirection: flexRow }]}>
              <ThemedText style={[styles.rangeText, { textAlign }]}>
                {formatPosition(item.startPosition, language)}
              </ThemedText>
              <ThemedText style={[styles.arrow, { color: theme.primary }]}>{arrow}</ThemedText>
              <ThemedText style={[styles.rangeText, { textAlign }]}>
                {formatPosition(item.endPosition, language)}
              </ThemedText>
              <Badge label={t('schedule.versesThisDay', { n: item.versesThisDay })} />
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.two,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  summary: {
    marginBottom: Spacing.two,
  },
  summaryTop: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  sectionHeader: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.two,
    gap: Spacing.two,
    borderRadius: Radius.small,
  },
  dayRow: {
    paddingVertical: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: Spacing.one,
  },
  dayTop: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  range: {
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  rangeText: {
    fontSize: 15,
    fontWeight: '600',
  },
  arrow: {
    fontSize: 16,
    fontWeight: '700',
  },
});
