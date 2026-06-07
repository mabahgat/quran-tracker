import { useTranslation } from 'react-i18next';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { Badge } from '@/components/Badge';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useDirection } from '@/hooks/use-direction';
import { useTheme } from '@/hooks/use-theme';
import { LANGUAGES, Language } from '@/i18n';
import { useApp } from '@/state/AppProvider';
import { templateName } from '@/utils/format';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { textAlign, flexRow } = useDirection();
  const { language, setLanguage, plans, defaultPlan, setDefaultPlan } = useApp();

  const changeLanguage = async (next: Language) => {
    if (next === language) return;
    const directionChanged = await setLanguage(next);
    if (directionChanged) {
      Alert.alert(t('app.title'), t('settings.restartNote'));
    }
  };

  const languageLabel = (code: Language) =>
    code === 'ar' ? t('settings.arabic') : t('settings.english');

  return (
    <Screen>
      <View style={styles.section}>
        <ThemedText style={[styles.heading, { textAlign }]}>
          {t('settings.languageHeading')}
        </ThemedText>
        {LANGUAGES.map((code) => {
          const selected = code === language;
          return (
            <Pressable key={code} onPress={() => changeLanguage(code)}>
              <Card
                style={
                  selected
                    ? { borderColor: theme.primary, backgroundColor: theme.backgroundSelected }
                    : undefined
                }>
                <View style={[styles.row, { flexDirection: flexRow }]}>
                  <ThemedText style={[styles.rowLabel, { textAlign }]}>{languageLabel(code)}</ThemedText>
                  <ThemedText style={{ color: theme.primary, fontSize: 18 }}>
                    {selected ? '●' : '○'}
                  </ThemedText>
                </View>
              </Card>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.section}>
        <ThemedText style={[styles.heading, { textAlign }]}>
          {t('settings.defaultPlanHeading')}
        </ThemedText>
        {plans.length === 0 ? (
          <Card>
            <ThemedText style={{ textAlign, color: theme.textSecondary }}>
              {t('settings.noPlans')}
            </ThemedText>
          </Card>
        ) : (
          plans.map((plan) => {
            const selected = defaultPlan?.id === plan.id;
            return (
              <Pressable key={plan.id} onPress={() => setDefaultPlan(plan.id)}>
                <Card
                  style={selected ? { borderColor: theme.primary } : undefined}>
                  <View style={[styles.row, { flexDirection: flexRow }]}>
                    <View style={styles.flexShrink}>
                      <ThemedText style={[styles.rowLabel, { textAlign }]}>{plan.name}</ThemedText>
                      <ThemedText type="small" style={{ textAlign, color: theme.textSecondary }}>
                        {templateName(plan.templateId, language)}
                      </ThemedText>
                    </View>
                    {selected ? <Badge tone="primary" label={t('plans.defaultBadge')} /> : null}
                  </View>
                </Card>
              </Pressable>
            );
          })
        )}
      </View>

      <Card>
        <ThemedText style={[styles.heading, { textAlign }]}>{t('settings.aboutHeading')}</ThemedText>
        <ThemedText style={{ textAlign, color: theme.textSecondary }}>
          {t('settings.aboutBody')}
        </ThemedText>
        <ThemedText type="small" style={{ textAlign, color: theme.textSecondary }}>
          {t('settings.dataNote')}
        </ThemedText>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.two,
    width: '100%',
  },
  heading: {
    fontWeight: '700',
    fontSize: 17,
  },
  row: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: '600',
    flexShrink: 1,
  },
  flexShrink: {
    flexShrink: 1,
  },
});
