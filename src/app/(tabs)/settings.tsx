import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/themed-text';
import { useToast } from '@/components/Toast';
import { Radius, Spacing } from '@/constants/theme';
import { scheduleToCsv, parseScheduleCsv } from '@/domain/scheduleCsv';
import { templateScheduleDays } from '@/domain/scheduleExport';
import { CadenceTemplate, ExplicitScheduleDay } from '@/domain/types';
import { useDirection } from '@/hooks/use-direction';
import { useTheme } from '@/hooks/use-theme';
import { LANGUAGES, Language } from '@/i18n';
import { useApp } from '@/state/AppProvider';
import { templateNameOf } from '@/utils/format';
import { csvFileName, pickCsv, shareCsv } from '@/utils/scheduleShare';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { textAlign, flexRow } = useDirection();
  const { showToast } = useToast();
  const {
    language,
    setLanguage,
    plans,
    defaultPlan,
    setDefaultPlan,
    templates,
    importSchedule,
    deleteUserSchedule,
  } = useApp();

  const [busy, setBusy] = useState(false);
  const [pendingDays, setPendingDays] = useState<ExplicitScheduleDay[] | null>(null);
  const [pendingSkipped, setPendingSkipped] = useState(0);
  const [importName, setImportName] = useState('');
  const [importSource, setImportSource] = useState('');

  const changeLanguage = async (next: Language) => {
    if (next === language) return;
    const directionChanged = await setLanguage(next);
    if (directionChanged) {
      Alert.alert(t('app.title'), t('settings.restartNote'));
    }
  };

  const exportTemplate = async (template: CadenceTemplate) => {
    try {
      setBusy(true);
      const days = templateScheduleDays(template);
      const csv = scheduleToCsv(days);
      await shareCsv(csvFileName(templateNameOf(template, language)), csv);
    } catch {
      Alert.alert(t('schedules.title'), t('schedules.exportError'));
    } finally {
      setBusy(false);
    }
  };

  const startImport = async () => {
    try {
      setBusy(true);
      const picked = await pickCsv();
      if (!picked) return;
      const { days, errors } = parseScheduleCsv(picked.content);
      if (days.length === 0) {
        Alert.alert(t('schedules.importErrorTitle'), errors[0] ?? t('schedules.importEmpty'));
        return;
      }
      setPendingDays(days);
      setPendingSkipped(errors.length);
      setImportName(picked.name);
      setImportSource(`${picked.name}.csv`);
    } catch {
      Alert.alert(t('schedules.importErrorTitle'), t('schedules.importError'));
    } finally {
      setBusy(false);
    }
  };

  const cancelImport = () => {
    setPendingDays(null);
    setPendingSkipped(0);
    setImportName('');
  };

  const confirmImport = async () => {
    if (!pendingDays) return;
    const name = importName.trim();
    if (name.length === 0) return;
    await importSchedule({ name, source: importSource, days: pendingDays });
    const skipped = pendingSkipped;
    cancelImport();
    showToast(t('schedules.imported', { count: pendingDays.length }));
    if (skipped > 0) {
      Alert.alert(t('schedules.title'), t('schedules.importedWithSkips', { count: skipped }));
    }
  };

  const confirmDelete = (template: CadenceTemplate) => {
    const inUse = plans.filter((plan) => plan.templateId === template.id).length;
    const body =
      inUse > 0 ? t('schedules.deleteInUse', { count: inUse }) : t('schedules.deleteBody');
    Alert.alert(templateNameOf(template, language), body, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          await deleteUserSchedule(template.id);
          showToast(t('schedules.deleted'));
        },
      },
    ]);
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
                        {templateNameOf(plan.templateSnapshot, language)}
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

      <View style={styles.section}>
        <View style={[styles.row, { flexDirection: flexRow }]}>
          <ThemedText style={[styles.heading, { textAlign }]}>
            {t('schedules.heading')}
          </ThemedText>
          {busy ? <ActivityIndicator color={theme.primary} /> : null}
        </View>
        <ThemedText type="small" style={{ textAlign, color: theme.textSecondary }}>
          {t('schedules.intro')}
        </ThemedText>
        <Button title={t('schedules.import')} variant="secondary" onPress={startImport} />
        {templates.map((template) => (
          <Card key={template.id}>
            <View style={[styles.row, { flexDirection: flexRow }]}>
              <View style={styles.flexShrink}>
                <ThemedText style={[styles.rowLabel, { textAlign }]}>
                  {templateNameOf(template, language)}
                </ThemedText>
                {template.userDefined ? (
                  <View style={[styles.badgeRow, { flexDirection: flexRow }]}>
                    <Badge tone="primary" label={t('schedules.userBadge')} />
                  </View>
                ) : null}
              </View>
            </View>
            <View style={[styles.scheduleActions, { flexDirection: flexRow }]}>
              <Button
                style={styles.flex}
                variant="secondary"
                title={t('schedules.export')}
                onPress={() => exportTemplate(template)}
              />
              {template.userDefined ? (
                <Button
                  style={styles.flex}
                  variant="ghost"
                  title={t('common.delete')}
                  onPress={() => confirmDelete(template)}
                />
              ) : null}
            </View>
          </Card>
        ))}
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

      <Modal
        visible={pendingDays !== null}
        transparent
        animationType="fade"
        onRequestClose={cancelImport}>
        <Pressable style={styles.modalOverlay} onPress={cancelImport}>
          <Pressable
            style={[styles.modalCard, { backgroundColor: theme.background, borderColor: theme.border }]}
            onPress={() => {}}>
            <ThemedText style={[styles.heading, { textAlign }]}>{t('schedules.nameTitle')}</ThemedText>
            <ThemedText type="small" style={{ textAlign, color: theme.textSecondary }}>
              {t('schedules.dayCount', { count: pendingDays?.length ?? 0 })}
            </ThemedText>
            <TextInput
              value={importName}
              onChangeText={setImportName}
              placeholder={t('schedules.namePlaceholder')}
              placeholderTextColor={theme.textSecondary}
              autoFocus
              style={[styles.input, { color: theme.text, borderColor: theme.border, textAlign }]}
            />
            <Button title={t('common.save')} onPress={confirmImport} />
            <Button variant="ghost" title={t('common.cancel')} onPress={cancelImport} />
          </Pressable>
        </Pressable>
      </Modal>
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
  flex: {
    flex: 1,
  },
  badgeRow: {
    marginTop: Spacing.one,
  },
  scheduleActions: {
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  modalCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.large,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  input: {
    minHeight: 48,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.medium,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
});
