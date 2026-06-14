import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { SectionList, StyleSheet, View } from 'react-native';

import { Badge } from '@/components/Badge';
import { Card } from '@/components/Card';
import { InfoRow } from '@/components/InfoRow';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { ExplicitSchedule, ExplicitScheduleDay } from '@/domain/explicitSchedule';
import { cumulativeIndexOf } from '@/domain/quran';
import { TemplateId } from '@/domain/types';
import { useDirection } from '@/hooks/use-direction';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/state/AppProvider';
import { addDays } from '@/utils/date';
import { directionalArrow, formatPosition } from '@/utils/format';

interface Section {
  phase: number;
  data: ExplicitScheduleDay[];
}

interface ExplicitScheduleViewProps {
  schedule: ExplicitSchedule;
  templateId: TemplateId;
  startDate: string;
}

export function ExplicitScheduleView({ schedule, templateId, startDate }: ExplicitScheduleViewProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { textAlign, flexRow, language, isRTL } = useDirection();
  const { templateLabel } = useApp();

  const sections = useMemo<Section[]>(() => {
    const result: Section[] = [];
    let current: Section | null = null;
    for (const day of schedule.days) {
      if (!current || current.phase !== day.phase) {
        current = { phase: day.phase, data: [] };
        result.push(current);
      }
      current.data.push(day);
    }
    return result;
  }, [schedule]);

  const arrow = directionalArrow(isRTL);
  const finishDate = addDays(startDate, schedule.totalDays - 1);

  const header = (
    <Card style={styles.summary}>
      <View style={[styles.summaryTop, { flexDirection: flexRow }]}>
        <Badge tone="primary" label={templateLabel(templateId)} />
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          {schedule.source}
        </ThemedText>
      </View>
      <InfoRow label={t('schedule.startDate')} value={startDate} />
      <InfoRow label={t('schedule.finishDate')} value={finishDate} emphasize />
      <InfoRow label={t('schedule.totalDays')} value={String(schedule.totalDays)} />
      {schedule.totalPages != null ? (
        <InfoRow label={t('schedule.pages', { n: schedule.totalPages })} value={`1 ${arrow} ${schedule.totalPages}`} />
      ) : null}
      <ThemedText type="small" style={{ textAlign, color: theme.textSecondary }}>
        {t('schedule.expertNote')}
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
              {t('schedule.phase', { n: section.phase })}
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              {t('schedule.phaseDays', { n: section.data.length })}
            </ThemedText>
          </View>
        )}
        renderItem={({ item }) => {
          const date = addDays(startDate, item.day - 1);
          const hasPages = item.pages != null;
          const pagesLabel = item.pages === 1 ? t('schedule.onePage') : t('schedule.pages', { n: item.pages });
          const verses = cumulativeIndexOf(item.to) - cumulativeIndexOf(item.from) + 1;
          return (
            <View style={[styles.dayRow, { borderColor: theme.border }]}>
              <View style={[styles.dayTop, { flexDirection: flexRow }]}>
                <View style={[styles.dayLabelRow, { flexDirection: flexRow }]}>
                  <ThemedText type="smallBold" style={{ textAlign }}>
                    {t('schedule.dayLabel', { n: item.day })}
                  </ThemedText>
                  {item.isReview ? <Badge tone="warning" label={t('schedule.reviewDay')} /> : null}
                </View>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  {date}
                </ThemedText>
              </View>

              <View style={[styles.range, { flexDirection: flexRow }]}>
                <ThemedText style={[styles.rangeText, { textAlign }]}>
                  {formatPosition({ surah: item.from.surah, ayah: item.from.ayah }, language)}
                </ThemedText>
                <ThemedText style={[styles.arrow, { color: theme.primary }]}>{arrow}</ThemedText>
                <ThemedText style={[styles.rangeText, { textAlign }]}>
                  {formatPosition({ surah: item.to.surah, ayah: item.to.ayah }, language)}
                </ThemedText>
              </View>
              <View style={[styles.metaRow, { flexDirection: flexRow }]}>
                {hasPages ? (
                  <Badge tone={item.isReview ? 'warning' : 'primary'} label={pagesLabel} />
                ) : item.isReview ? (
                  <Badge tone="warning" label={t('schedule.reviewDay')} />
                ) : null}
                <Badge label={t('schedule.versesThisDay', { n: verses })} />
                {hasPages && item.from.page != null && item.to.page != null ? (
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>
                    {t('schedule.page', { n: item.from.page })} {arrow}{' '}
                    {t('schedule.page', { n: item.to.page })}
                  </ThemedText>
                ) : null}
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  dayLabelRow: {
    alignItems: 'center',
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
  metaRow: {
    alignItems: 'center',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
});
