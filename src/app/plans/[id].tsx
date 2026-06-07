import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { InfoRow } from '@/components/InfoRow';
import { ProgressBar } from '@/components/ProgressBar';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/themed-text';
import { useToast } from '@/components/Toast';
import { Radius, Spacing } from '@/constants/theme';
import { TOTAL_AYAH } from '@/domain/quran';
import { dailyTargetFor, TEMPLATES } from '@/domain/templates';
import { ProgressStatus } from '@/domain/types';
import { useDirection } from '@/hooks/use-direction';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/state/AppProvider';
import { usePlan } from '@/state/usePlan';
import { formatPosition } from '@/utils/format';

const STATUS_TONE: Record<ProgressStatus, 'success' | 'warning' | 'danger'> = {
  full: 'success',
  partial: 'warning',
  missed: 'danger',
};

export default function PlanDetailScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const { textAlign, flexRow, language } = useDirection();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { plan, entries, projection, reload } = usePlan(id);
  const { setDefaultPlan, renamePlan, changePlanTemplate } = useApp();
  const { showToast } = useToast();

  const [editing, setEditing] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const [nameError, setNameError] = useState(false);

  if (!plan || !projection) {
    return (
      <Screen>
        <Card>
          <ThemedText style={{ textAlign, color: theme.textSecondary }}>
            {t('detail.noHistory')}
          </ThemedText>
        </Card>
      </Screen>
    );
  }

  const makeDefault = async () => {
    await setDefaultPlan(plan.id);
    await reload();
  };

  const selectTemplate = async (templateId: typeof plan.templateId) => {
    if (templateId === plan.templateId) return;
    await changePlanTemplate(plan.id, templateId);
    await reload();
    showToast(t('detail.cadenceChanged', { template: t(`templates.${templateId}`) }));
  };

  const startEdit = () => {
    setNameValue(plan.name);
    setNameError(false);
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setNameError(false);
  };

  const saveName = async () => {
    const trimmed = nameValue.trim();
    if (trimmed.length === 0) {
      setNameError(true);
      return;
    }
    await renamePlan(plan.id, trimmed);
    await reload();
    setEditing(false);
  };

  const history = [...entries].reverse();

  return (
    <Screen>
      <View style={styles.header}>
        {editing ? (
          <View style={styles.editBox}>
            <TextInput
              value={nameValue}
              onChangeText={(value) => {
                setNameValue(value);
                if (nameError) setNameError(false);
              }}
              placeholder={t('newPlan.namePlaceholder')}
              placeholderTextColor={theme.textSecondary}
              autoFocus
              style={[styles.input, { color: theme.text, borderColor: theme.border, textAlign }]}
            />
            {nameError ? (
              <ThemedText type="small" style={{ textAlign, color: theme.danger }}>
                {t('newPlan.nameRequired')}
              </ThemedText>
            ) : null}
            <View style={[styles.editActions, { flexDirection: flexRow }]}>
              <Button style={styles.flex} title={t('common.save')} onPress={saveName} />
              <Button
                style={styles.flex}
                variant="ghost"
                title={t('common.cancel')}
                onPress={cancelEdit}
              />
            </View>
          </View>
        ) : (
          <View style={[styles.titleRow, { flexDirection: flexRow }]}>
            <ThemedText type="title" style={[styles.title, { textAlign }]}>
              {plan.name}
            </ThemedText>
            <Button variant="ghost" title={t('detail.editName')} onPress={startEdit} />
          </View>
        )}
        <View style={[styles.meta, { flexDirection: flexRow }]}>
          <Badge tone="primary" label={t(`templates.${plan.templateId}`)} />
          {plan.isDefault ? <Badge tone="success" label={t('plans.defaultBadge')} /> : null}
        </View>
      </View>

      <Card>
        <ThemedText style={[styles.heading, { textAlign }]}>{t('detail.statsHeading')}</ThemedText>
        <InfoRow label={t('detail.daysLogged')} value={String(projection.loggedDays)} />
        <InfoRow
          label={t('detail.versesMemorized')}
          value={`${projection.totalMemorized} / ${TOTAL_AYAH}`}
        />
        <ProgressBar percent={projection.percentComplete} />
        <ThemedText type="smallBold" style={{ textAlign }}>
          {Math.round(projection.percentComplete)}%
        </ThemedText>
      </Card>

      <Card>
        <ThemedText style={[styles.heading, { textAlign }]}>{t('home.currentPosition')}</ThemedText>
        <ThemedText style={[styles.position, { textAlign, color: theme.primary }]}>
          {projection.position ? formatPosition(projection.position, language) : t('home.notStarted')}
        </ThemedText>
      </Card>

      <Card>
        <ThemedText style={[styles.heading, { textAlign }]}>
          {t('home.projectionHeading')}
        </ThemedText>
        {projection.isComplete ? (
          <ThemedText style={{ textAlign, color: theme.success }}>{t('home.complete')}</ThemedText>
        ) : projection.projectedFinishDate ? (
          <View style={styles.gap}>
            <InfoRow label={t('home.projectedFinish')} value={projection.projectedFinishDate} emphasize />
            <InfoRow label={t('home.targetFinish')} value={projection.targetFinishDate} />
          </View>
        ) : (
          <ThemedText style={{ textAlign, color: theme.textSecondary }}>
            {t('home.needProgress')}
          </ThemedText>
        )}
      </Card>

      <Card>
        <ThemedText style={[styles.heading, { textAlign }]}>{t('detail.cadenceHeading')}</ThemedText>
        {TEMPLATES.map((template) => {
          const selected = template.id === plan.templateId;
          return (
            <Pressable key={template.id} onPress={() => selectTemplate(template.id)}>
              <View
                style={[
                  styles.cadenceRow,
                  {
                    flexDirection: flexRow,
                    borderColor: selected ? theme.primary : theme.border,
                    backgroundColor: selected ? theme.backgroundSelected : 'transparent',
                  },
                ]}>
                <View style={styles.flexShrink}>
                  <ThemedText style={[styles.cadenceName, { textAlign }]}>
                    {t(`templates.${template.id}`)}
                  </ThemedText>
                  <ThemedText type="small" style={{ textAlign, color: theme.textSecondary }}>
                    {t('templates.perDay', { n: dailyTargetFor(template.id) })}
                  </ThemedText>
                </View>
                <ThemedText style={{ color: theme.primary, fontSize: 18 }}>
                  {selected ? '●' : '○'}
                </ThemedText>
              </View>
            </Pressable>
          );
        })}
        <ThemedText type="small" style={{ textAlign, color: theme.textSecondary }}>
          {t('detail.cadenceNote')}
        </ThemedText>
      </Card>

      <Card>
        <ThemedText style={[styles.heading, { textAlign }]}>{t('detail.historyHeading')}</ThemedText>
        {history.length === 0 ? (
          <ThemedText style={{ textAlign, color: theme.textSecondary }}>
            {t('detail.noHistory')}
          </ThemedText>
        ) : (
          history.map((entry) => (
            <View key={entry.id} style={[styles.historyRow, { flexDirection: flexRow }]}>
              <ThemedText style={{ textAlign }}>{entry.date}</ThemedText>
              <View style={[styles.historyRight, { flexDirection: flexRow }]}>
                {entry.status === 'partial' ? (
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>
                    {entry.verses}
                  </ThemedText>
                ) : null}
                <Badge tone={STATUS_TONE[entry.status]} label={t(`status.${entry.status}`)} />
              </View>
            </View>
          ))
        )}
      </Card>

      <Button
        variant="secondary"
        title={t('detail.viewSchedule')}
        onPress={() =>
          router.push({
            pathname: '/templates/[id]',
            params: {
              id: plan.templateId,
              start: plan.startDate,
              target: String(plan.templateSnapshot.dailyTarget),
              duration: String(plan.templateSnapshot.durationDays),
            },
          })
        }
      />

      {!plan.isDefault ? (
        <Button variant="secondary" title={t('detail.makeDefault')} onPress={makeDefault} />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: Spacing.two,
  },
  titleRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  title: {
    fontSize: 30,
    lineHeight: 36,
    flexShrink: 1,
  },
  editBox: {
    gap: Spacing.two,
  },
  input: {
    minHeight: 48,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.medium,
    paddingHorizontal: Spacing.three,
    fontSize: 20,
    fontWeight: '700',
  },
  editActions: {
    gap: Spacing.two,
  },
  flex: {
    flex: 1,
  },
  meta: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  heading: {
    fontWeight: '700',
    fontSize: 17,
  },
  position: {
    fontSize: 22,
    lineHeight: 30,
    fontWeight: '700',
  },
  gap: {
    gap: Spacing.one,
  },
  cadenceRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.medium,
  },
  cadenceName: {
    fontSize: 16,
    fontWeight: '600',
  },
  flexShrink: {
    flexShrink: 1,
  },
  historyRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    gap: Spacing.two,
  },
  historyRight: {
    alignItems: 'center',
    gap: Spacing.two,
  },
});
