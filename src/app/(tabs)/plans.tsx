import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';

import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/themed-text';
import { useToast } from '@/components/Toast';
import { Radius, Spacing } from '@/constants/theme';
import { parsePlanExport } from '@/domain/planTransfer';
import { useDirection } from '@/hooks/use-direction';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/state/AppProvider';
import { templateNameOf } from '@/utils/format';
import { pickJson } from '@/utils/scheduleShare';

export default function PlansScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const theme = useTheme();
  const { textAlign, flexRow, language, isRTL } = useDirection();
  const { plans, setDefaultPlan, deletePlan, importPlan } = useApp();
  const { showToast } = useToast();

  const confirmDelete = (id: string) => {
    Alert.alert(t('plans.deleteConfirmTitle'), t('plans.deleteConfirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => deletePlan(id) },
    ]);
  };

  const startImport = async () => {
    let picked;
    try {
      picked = await pickJson();
    } catch {
      Alert.alert(t('plans.importErrorTitle'), t('plans.importError'));
      return;
    }
    if (!picked) return;
    try {
      const parsed = parsePlanExport(picked.content);
      const plan = await importPlan(parsed);
      showToast(t('plans.imported', { name: plan.name }));
      router.push({ pathname: '/plans/[id]', params: { id: plan.id } });
    } catch (error) {
      const message = error instanceof Error ? error.message : t('plans.importError');
      Alert.alert(t('plans.importErrorTitle'), message);
    }
  };

  const renderDeleteAction = (id: string) => (
    <Pressable
      accessibilityRole="button"
      onPress={() => confirmDelete(id)}
      style={[styles.swipeDelete, { backgroundColor: theme.danger }]}>
      <ThemedText style={[styles.swipeDeleteText, { color: theme.onPrimary }]}>
        {t('common.delete')}
      </ThemedText>
    </Pressable>
  );

  return (
    <Screen>
      <Button title={t('plans.new')} onPress={() => router.push('/plans/new')} />
      <Button variant="secondary" title={t('plans.import')} onPress={startImport} />

      {plans.length === 0 ? (
        <Card>
          <ThemedText style={{ textAlign, color: theme.textSecondary }}>{t('plans.empty')}</ThemedText>
        </Card>
      ) : (
        plans.map((plan) => (
          <Swipeable
            key={plan.id}
            friction={2}
            overshootRight={false}
            overshootLeft={false}
            renderRightActions={isRTL ? undefined : () => renderDeleteAction(plan.id)}
            renderLeftActions={isRTL ? () => renderDeleteAction(plan.id) : undefined}>
            <Card>
              <Pressable
                onPress={() => router.push({ pathname: '/plans/[id]', params: { id: plan.id } })}
                style={styles.cardBody}>
                <View style={[styles.titleRow, { flexDirection: flexRow }]}>
                  <ThemedText style={[styles.name, { textAlign }]}>{plan.name}</ThemedText>
                  {plan.isDefault ? <Badge tone="primary" label={t('plans.defaultBadge')} /> : null}
                </View>
                <ThemedText type="small" style={{ textAlign, color: theme.textSecondary }}>
                  {templateNameOf(plan.templateSnapshot, language)} · {t('plans.startedOn', { date: plan.startDate })}
                </ThemedText>
              </Pressable>
              {!plan.isDefault ? (
                <View style={[styles.actions, { flexDirection: flexRow }]}>
                  <Button
                    style={styles.flex}
                    variant="secondary"
                    title={t('plans.setDefault')}
                    onPress={() => setDefaultPlan(plan.id)}
                  />
                </View>
              ) : null}
            </Card>
          </Swipeable>
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
  swipeDelete: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 96,
    marginStart: Spacing.two,
    borderRadius: Radius.large,
  },
  swipeDeleteText: {
    fontWeight: '700',
  },
});
