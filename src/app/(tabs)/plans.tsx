import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useDirection } from '@/hooks/use-direction';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/state/AppProvider';

export default function PlansScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const theme = useTheme();
  const { textAlign, flexRow } = useDirection();
  const { plans, setDefaultPlan, deletePlan } = useApp();

  const confirmDelete = (id: string) => {
    Alert.alert(t('plans.deleteConfirmTitle'), t('plans.deleteConfirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => deletePlan(id) },
    ]);
  };

  return (
    <Screen>
      <Button title={t('plans.new')} onPress={() => router.push('/plans/new')} />

      {plans.length === 0 ? (
        <Card>
          <ThemedText style={{ textAlign, color: theme.textSecondary }}>{t('plans.empty')}</ThemedText>
        </Card>
      ) : (
        plans.map((plan) => (
          <Card key={plan.id}>
            <Pressable
              onPress={() => router.push({ pathname: '/plans/[id]', params: { id: plan.id } })}
              style={styles.cardBody}>
              <View style={[styles.titleRow, { flexDirection: flexRow }]}>
                <ThemedText style={[styles.name, { textAlign }]}>{plan.name}</ThemedText>
                {plan.isDefault ? <Badge tone="primary" label={t('plans.defaultBadge')} /> : null}
              </View>
              <ThemedText type="small" style={{ textAlign, color: theme.textSecondary }}>
                {t(`templates.${plan.templateId}`)} · {t('plans.startedOn', { date: plan.startDate })}
              </ThemedText>
            </Pressable>
            <View style={[styles.actions, { flexDirection: flexRow }]}>
              {!plan.isDefault ? (
                <Button
                  style={styles.flex}
                  variant="secondary"
                  title={t('plans.setDefault')}
                  onPress={() => setDefaultPlan(plan.id)}
                />
              ) : null}
              <Button
                style={styles.flex}
                variant="ghost"
                title={t('common.delete')}
                onPress={() => confirmDelete(plan.id)}
              />
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  cardBody: {
    gap: Spacing.one,
  },
  titleRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    flexShrink: 1,
  },
  actions: {
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  flex: {
    flex: 1,
  },
});
