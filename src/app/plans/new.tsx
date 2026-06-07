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
import { dailyTargetFor, TEMPLATES } from '@/domain/templates';
import { TemplateId } from '@/domain/types';
import { useDirection } from '@/hooks/use-direction';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/state/AppProvider';
import { todayISO } from '@/utils/date';

export default function NewPlanScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const theme = useTheme();
  const { textAlign, flexRow } = useDirection();
  const { createPlan } = useApp();

  const [name, setName] = useState('');
  const [templateId, setTemplateId] = useState<TemplateId>('100-days');
  const [error, setError] = useState(false);

  const submit = async () => {
    if (name.trim().length === 0) {
      setError(true);
      return;
    }
    await createPlan({ name, templateId });
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
        {TEMPLATES.map((template) => {
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
                      {t(`templates.${template.id}`)}
                    </ThemedText>
                    <ThemedText type="small" style={{ textAlign, color: theme.textSecondary }}>
                      {t('templates.perDay', { n: dailyTargetFor(template.id) })}
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
                    params: { id: template.id, start: todayISO() },
                  })
                }
              />
            </Card>
          );
        })}
      </View>

      <Card>
        <View style={[styles.templateRow, { flexDirection: flexRow }]}>
          <ThemedText style={{ color: theme.textSecondary, textAlign }}>
            {t('newPlan.startDateLabel')}
          </ThemedText>
          <ThemedText style={{ fontWeight: '600' }}>{todayISO()}</ThemedText>
        </View>
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
});
