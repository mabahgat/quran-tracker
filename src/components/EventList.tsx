import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { SectionList, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { AppEvent, EventType } from '@/domain/types';
import { useDirection } from '@/hooks/use-direction';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/state/AppProvider';
import { localDateTimeParts } from '@/utils/date';

const ICONS: Record<EventType, string> = {
  plan_created: '🆕',
  plan_renamed: '✏️',
  plan_template_changed: '🔄',
  plan_set_default: '⭐',
  plan_deleted: '🗑️',
  progress_logged: '📖',
  progress_deleted: '🧹',
};

const PROGRESS_ICON: Record<string, string> = {
  full: '✅',
  partial: '🟡',
  missed: '⭕',
};

interface Section {
  date: string;
  data: AppEvent[];
}

interface EventListProps {
  events: AppEvent[];
  /** Hide the per-row plan name (used when the list is already scoped to a plan). */
  showPlanName?: boolean;
  ListHeaderComponent?: React.ComponentProps<typeof SectionList>['ListHeaderComponent'];
}

export function eventIcon(event: AppEvent): string {
  if (event.type === 'progress_logged') {
    return PROGRESS_ICON[String(event.details.status)] ?? ICONS.progress_logged;
  }
  return ICONS[event.type];
}

export function useEventTitle() {
  const { t } = useTranslation();
  const { templateLabel } = useApp();
  return (event: AppEvent): string => {
    switch (event.type) {
      case 'plan_renamed':
        return t('log.event.plan_renamed', {
          from: String(event.details.from ?? ''),
          to: String(event.details.to ?? ''),
        });
      case 'plan_template_changed':
        return t('log.event.plan_template_changed', {
          template: templateLabel(String(event.details.toTemplateId ?? '')),
        });
      case 'progress_logged': {
        const status = String(event.details.status);
        const verses = Number(event.details.verses ?? 0);
        if (status === 'missed') return t('log.event.logged_missed');
        return t(status === 'full' ? 'log.event.logged_full' : 'log.event.logged_partial', { verses });
      }
      default:
        return t(`log.event.${event.type}`);
    }
  };
}

export function EventList({ events, showPlanName = true, ListHeaderComponent }: EventListProps) {
  const theme = useTheme();
  const { textAlign, flexRow } = useDirection();
  const titleFor = useEventTitle();

  const sections = useMemo<Section[]>(() => {
    const result: Section[] = [];
    let current: Section | null = null;
    for (const event of events) {
      const { date } = localDateTimeParts(event.createdAt);
      if (!current || current.date !== date) {
        current = { date, data: [] };
        result.push(current);
      }
      current.data.push(event);
    }
    return result;
  }, [events]);

  return (
    <SectionList
      sections={sections}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={ListHeaderComponent}
      contentContainerStyle={styles.content}
      stickySectionHeadersEnabled={false}
      initialNumToRender={25}
      renderSectionHeader={({ section }) => (
        <View style={[styles.sectionHeader, { backgroundColor: theme.background }]}>
          <ThemedText type="smallBold" style={{ color: theme.primary, textAlign }}>
            {section.date}
          </ThemedText>
        </View>
      )}
      renderItem={({ item }) => {
        const { time } = localDateTimeParts(item.createdAt);
        return (
          <View style={[styles.row, { flexDirection: flexRow, borderColor: theme.border }]}>
            <ThemedText style={styles.icon}>{eventIcon(item)}</ThemedText>
            <View style={styles.body}>
              <ThemedText style={[styles.title, { textAlign }]}>{titleFor(item)}</ThemedText>
              {showPlanName ? (
                <ThemedText type="small" style={{ textAlign, color: theme.textSecondary }}>
                  {item.planName}
                </ThemedText>
              ) : null}
            </View>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              {time}
            </ThemedText>
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.three,
    gap: Spacing.one,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  sectionHeader: {
    paddingTop: Spacing.three,
    paddingBottom: Spacing.one,
  },
  row: {
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.small,
  },
  icon: {
    fontSize: 22,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
  },
});
