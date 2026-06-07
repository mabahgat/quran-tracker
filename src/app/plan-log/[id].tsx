import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/Card';
import { EventList } from '@/components/EventList';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useDirection } from '@/hooks/use-direction';
import { useTheme } from '@/hooks/use-theme';
import { useEvents } from '@/state/useEvents';

export default function PlanLogScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { textAlign } = useDirection();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { events, removeEvent } = useEvents({ planId: id });

  if (events.length === 0) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: theme.background }]}>
        <Card>
          <ThemedText style={{ textAlign, color: theme.textSecondary }}>
            {t('log.emptyPlan')}
          </ThemedText>
        </Card>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <EventList events={events} showPlanName={false} onDelete={(event) => removeEvent(event.id)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.three,
  },
});
