import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { TemplateId } from '@/domain/types';
import { useDirection } from '@/hooks/use-direction';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/state/AppProvider';
import { templateNameOf } from '@/utils/format';
import { addDays, isValidISODate, todayISO } from '@/utils/date';

export default function NewPlanScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const theme = useTheme();
  const { textAlign, flexRow, language } = useDirection();
  const { createPlan, templates } = useApp();

  const [name, setName] = useState('');
  const [templateId, setTemplateId] = useState<TemplateId>('100-days');
  const [startDate, setStartDate] = useState(todayISO());
  const [error, setError] = useState(false);

  const startDateValid = isValidISODate(startDate);

  const shiftStart = (delta: number) => {
    if (startDateValid) {
      setStartDate(addDays(startDate, delta));
    }
  };

  const submit = async () => {
    if (name.trim().length === 0 || !startDateValid) {
      setError(true);
      return;
    }
    await createPlan({ name, templateId, startDate });
    router.back();
  };

  return (
    <Screen>
      <Card>
        <ThemedText style={[styles.label, { textAlign }]}>{t('newPlan.nameLabel')}</ThemedText>
        <TextInput
          value={name}
          onChangeText={(value) => {
            setName(value);
            if (error) setError(false);
          }}
          placeholder={t('newPlan.namePlaceholder')}
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, { color: theme.text, borderColor: theme.border, textAlign }]}
        />
        {error ? (
          <ThemedText type="small" style={{ textAlign, color: theme.danger }}>
            {t('newPlan.nameRequired')}
          </ThemedText>
        ) : null}
      </Card>

      <View style={styles.section}>
        <ThemedText style={[styles.label, { textAlign }]}>{t('newPlan.cadenceLabel')}</ThemedText>
        {templates.map((template) => {
          const selected = template.id === templateId;
          return (
            <Card
              key={template.id}
              style={
                selected
                  ? { borderColor: theme.primary, backgroundColor: theme.backgroundSelected }
                  : undefined
              }>
              <Pressable onPress={() => setTemplateId(template.id)}>
                <View style={[styles.templateRow, { flexDirection: flexRow }]}>
                  <View style={styles.flexShrink}>
                    <ThemedText style={[styles.templateName, { textAlign }]}>
                      {templateNameOf(template, language)}
                    </ThemedText>
                    <ThemedText type="small" style={{ textAlign, color: theme.textSecondary }}>
                      {t('templates.perDay', { n: template.dailyTarget })}
                    </ThemedText>
                    {template.kind === 'scheduled' ? (
                      <View style={[styles.badgeRow, { flexDirection: flexRow }]}>
                        <Badge tone="primary" label={t('templates.scheduledBadge')} />
                      </View>
                    ) : null}
                  </View>
                  <ThemedText style={{ color: theme.primary, fontSize: 18 }}>
                    {selected ? '●' : '○'}
                  </ThemedText>
                </View>
              </Pressable>
              <Button
                variant="ghost"
                title={t('newPlan.viewSchedule')}
                onPress={() =>
                  router.push({
                    pathname: '/templates/[id]',
                    params: { id: template.id, start: startDateValid ? startDate : todayISO() },
                  })
                }
              />
            </Card>
          );
        })}
      </View>

      <Card>
        <View style={[styles.dateHeader, { flexDirection: flexRow }]}>
          <ThemedText style={[styles.label, { textAlign }]}>{t('newPlan.startDateLabel')}</ThemedText>
          <Pressable onPress={() => setStartDate(todayISO())}>
            <ThemedText type="small" style={{ color: theme.primary }}>
              {t('newPlan.today')}
            </ThemedText>
          </Pressable>
        </View>
        <View style={styles.dateRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('newPlan.previousDay')}
            onPress={() => shiftStart(-1)}
            style={[styles.stepper, { borderColor: theme.border }]}>
            <ThemedText style={[styles.stepperText, { color: theme.primary }]}>−</ThemedText>
          </Pressable>
          <TextInput
            value={startDate}
            onChangeText={(value) => {
              setStartDate(value.replace(/[^0-9-]/g, ''));
              if (error) setError(false);
            }}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={theme.textSecondary}
            keyboardType="numbers-and-punctuation"
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={10}
            style={[styles.dateInput, { color: theme.text, borderColor: theme.border }]}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('newPlan.nextDay')}
            onPress={() => shiftStart(1)}
            style={[styles.stepper, { borderColor: theme.border }]}>
            <ThemedText style={[styles.stepperText, { color: theme.primary }]}>+</ThemedText>
          </Pressable>
        </View>
        {!startDateValid ? (
          <ThemedText type="small" style={{ textAlign, color: theme.danger }}>
            {t('newPlan.startDateInvalid')}
          </ThemedText>
        ) : null}
      </Card>

      <Button title={t('newPlan.create')} onPress={submit} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: {
    fontWeight: '700',
    fontSize: 15,
  },
  input: {
    minHeight: 48,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.medium,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  section: {
    gap: Spacing.two,
    width: '100%',
  },
  templateRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  templateName: {
    fontSize: 16,
    fontWeight: '600',
  },
  badgeRow: {
    marginTop: Spacing.one,
  },
  flexShrink: {
    flexShrink: 1,
  },
  dateHeader: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  stepper: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.medium,
  },
  stepperText: {
    fontSize: 22,
    fontWeight: '700',
  },
  dateInput: {
    flex: 1,
    minHeight: 48,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.medium,
    paddingHorizontal: Spacing.three,
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
  },
});
