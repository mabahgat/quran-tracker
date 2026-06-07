import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { InfoRow } from '@/components/InfoRow';
import { ProgressBar } from '@/components/ProgressBar';
import { Screen } from '@/components/Screen';
import { SurahPicker } from '@/components/SurahPicker';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import {
  cumulativeIndexOf,
  getSurah,
  isValidPosition,
  lastMemorizedPosition,
  nextPosition,
  TOTAL_AYAH,
} from '@/domain/quran';
import { QuranPosition } from '@/domain/types';
import { useDirection } from '@/hooks/use-direction';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/state/AppProvider';
import { usePlan } from '@/state/usePlan';
import { formatPosition, surahName } from '@/utils/format';

export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const theme = useTheme();
  const { textAlign, flexRow, language, isRTL } = useDirection();
  const { defaultPlan } = useApp();
  const { plan, projection, todayEntry, log, dailyGoal, isScheduled, scheduledTarget } =
    usePlan(defaultPlan?.id);

  const [partialMode, setPartialMode] = useState(false);
  const [partialEntryMode, setPartialEntryMode] = useState<'verses' | 'position'>('verses');
  const [partialValue, setPartialValue] = useState('');
  const [posSurah, setPosSurah] = useState(1);
  const [posAyah, setPosAyah] = useState('1');
  const [surahPickerVisible, setSurahPickerVisible] = useState(false);
  const [posError, setPosError] = useState<null | 'invalid' | 'behind'>(null);

  if (!plan || !projection) {
    return (
      <Screen>
        <Card>
          <ThemedText type="subtitle" style={[styles.heading, { textAlign }]}>
            {t('home.noDefaultTitle')}
          </ThemedText>
          <ThemedText style={{ textAlign, color: theme.textSecondary }}>
            {t('home.noDefaultBody')}
          </ThemedText>
          <Button title={t('home.createPlan')} onPress={() => router.push('/plans/new')} />
        </Card>
      </Screen>
    );
  }

  const logFull = () => {
    setPartialMode(false);
    log('full');
  };
  const logMissed = () => {
    setPartialMode(false);
    log('missed');
  };

  const memorizedBeforeToday = projection.totalMemorized - (todayEntry?.verses ?? 0);

  const openPartial = () => {
    setPartialValue(todayEntry?.status === 'partial' ? String(todayEntry.verses) : '');
    const start: QuranPosition =
      nextPosition(memorizedBeforeToday) ??
      lastMemorizedPosition(memorizedBeforeToday) ?? { surah: 1, ayah: 1 };
    setPosSurah(start.surah);
    setPosAyah(String(start.ayah));
    setPartialEntryMode('verses');
    setPosError(null);
    setPartialMode(true);
  };

  const onPickSurah = (surahNumber: number) => {
    setPosSurah(surahNumber);
    const max = getSurah(surahNumber).ayahCount;
    const current = parseInt(posAyah, 10);
    if (!Number.isFinite(current) || current < 1 || current > max) {
      setPosAyah('1');
    }
    setPosError(null);
  };

  const previewPosition: QuranPosition = { surah: posSurah, ayah: parseInt(posAyah, 10) };
  const previewValid = isValidPosition(previewPosition);
  const previewVerses = previewValid
    ? cumulativeIndexOf(previewPosition) - memorizedBeforeToday
    : null;

  const savePartial = () => {
    if (partialEntryMode === 'verses') {
      const parsed = parseInt(partialValue, 10);
      log('partial', Number.isFinite(parsed) ? parsed : 0);
      setPartialMode(false);
      return;
    }
    if (!previewValid) {
      setPosError('invalid');
      return;
    }
    const versesToday = cumulativeIndexOf(previewPosition) - memorizedBeforeToday;
    if (versesToday < 0) {
      setPosError('behind');
      return;
    }
    log('partial', versesToday);
    setPartialMode(false);
  };

  const variantFor = (status: string) =>
    todayEntry?.status === status ? ('primary' as const) : ('secondary' as const);

  const renderStatusLine = () => {
    if (!projection.isComplete && projection.daysAheadOfTarget !== null) {
      const days = projection.daysAheadOfTarget;
      if (days > 0) return <Badge tone="success" label={t('home.ahead', { n: days })} />;
      if (days < 0) return <Badge tone="danger" label={t('home.behind', { n: Math.abs(days) })} />;
      return <Badge tone="primary" label={t('home.onTrack')} />;
    }
    return null;
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push({ pathname: '/plans/[id]', params: { id: plan.id } })}
          style={({ pressed }) => [styles.titleRow, { flexDirection: flexRow, opacity: pressed ? 0.6 : 1 }]}>
          <ThemedText type="title" style={[styles.title, { textAlign }]}>
            {plan.name}
          </ThemedText>
          <ThemedText style={[styles.chevron, { color: theme.textSecondary }]}>
            {isRTL ? '‹' : '›'}
          </ThemedText>
        </Pressable>
        <View style={[styles.headerMeta, { flexDirection: flexRow }]}>
          <Badge tone="primary" label={t(`templates.${plan.templateId}`)} />
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            {isScheduled
              ? t('home.todayGoalShort', { n: dailyGoal })
              : t('templates.perDay', { n: plan.dailyTarget })}
          </ThemedText>
        </View>
      </View>

      <Card>
        <ThemedText style={[styles.heading, { textAlign }]}>{t('home.todayHeading')}</ThemedText>
        <ThemedText style={{ textAlign, color: theme.textSecondary }}>
          {t('home.todayQuestion')}
        </ThemedText>

        {!projection.isComplete ? (
          <View style={styles.goalBox}>
            <InfoRow label={t('home.todayGoalLabel')} value={t('home.versesCount', { n: dailyGoal })} />
            {isScheduled && scheduledTarget ? (
              <InfoRow label={t('home.upToLabel')} value={formatPosition(scheduledTarget, language)} />
            ) : null}
          </View>
        ) : null}
        <View style={[styles.buttonRow, { flexDirection: flexRow }]}>
          <Button style={styles.flex} title={t('home.logFull')} variant={variantFor('full')} onPress={logFull} />
          <Button
            style={styles.flex}
            title={t('home.logPartial')}
            variant={variantFor('partial')}
            onPress={openPartial}
          />
          <Button
            style={styles.flex}
            title={t('home.logMissed')}
            variant={variantFor('missed')}
            onPress={logMissed}
          />
        </View>

        {partialMode ? (
          <View style={styles.partialBox}>
            <View style={[styles.segment, { flexDirection: flexRow, borderColor: theme.border }]}>
              <Pressable
                onPress={() => {
                  setPartialEntryMode('verses');
                  setPosError(null);
                }}
                style={[
                  styles.segmentItem,
                  { backgroundColor: partialEntryMode === 'verses' ? theme.primary : 'transparent' },
                ]}>
                <ThemedText
                  type="smallBold"
                  style={{ color: partialEntryMode === 'verses' ? theme.onPrimary : theme.text }}>
                  {t('home.partialByVerses')}
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={() => {
                  setPartialEntryMode('position');
                  setPosError(null);
                }}
                style={[
                  styles.segmentItem,
                  { backgroundColor: partialEntryMode === 'position' ? theme.primary : 'transparent' },
                ]}>
                <ThemedText
                  type="smallBold"
                  style={{ color: partialEntryMode === 'position' ? theme.onPrimary : theme.text }}>
                  {t('home.partialByPosition')}
                </ThemedText>
              </Pressable>
            </View>

            {partialEntryMode === 'verses' ? (
              <>
                <ThemedText style={{ textAlign }}>{t('home.partialPrompt')}</ThemedText>
                <TextInput
                  value={partialValue}
                  onChangeText={setPartialValue}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor={theme.textSecondary}
                  style={[styles.input, { color: theme.text, borderColor: theme.border, textAlign }]}
                />
              </>
            ) : (
              <View style={styles.posBox}>
                <ThemedText style={{ textAlign, color: theme.textSecondary }}>
                  {t('home.surahLabel')}
                </ThemedText>
                <Pressable
                  onPress={() => setSurahPickerVisible(true)}
                  style={[styles.selectField, { flexDirection: flexRow, borderColor: theme.border }]}>
                  <ThemedText style={[styles.flexShrink, { textAlign }]}>
                    {surahName(getSurah(posSurah), language)} ({posSurah})
                  </ThemedText>
                  <ThemedText style={{ color: theme.textSecondary, fontSize: 16 }}>▾</ThemedText>
                </Pressable>

                <View style={[styles.spread, { flexDirection: flexRow }]}>
                  <ThemedText style={{ textAlign, color: theme.textSecondary }}>
                    {t('home.ayahLabel')}
                  </ThemedText>
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>
                    {t('home.ayahOf', { n: getSurah(posSurah).ayahCount })}
                  </ThemedText>
                </View>
                <TextInput
                  value={posAyah}
                  onChangeText={(value) => {
                    setPosAyah(value.replace(/[^0-9]/g, ''));
                    setPosError(null);
                  }}
                  keyboardType="number-pad"
                  placeholder="1"
                  placeholderTextColor={theme.textSecondary}
                  style={[styles.input, { color: theme.text, borderColor: theme.border, textAlign }]}
                />

                {posError === 'invalid' ? (
                  <ThemedText type="small" style={{ textAlign, color: theme.danger }}>
                    {t('home.positionInvalid')}
                  </ThemedText>
                ) : posError === 'behind' ? (
                  <ThemedText type="small" style={{ textAlign, color: theme.danger }}>
                    {t('home.positionBehind')}
                  </ThemedText>
                ) : previewValid && previewVerses !== null && previewVerses >= 0 ? (
                  <ThemedText type="small" style={{ textAlign, color: theme.primary }}>
                    {formatPosition(previewPosition, language)} {t('home.positionPreview', { n: previewVerses })}
                  </ThemedText>
                ) : null}
              </View>
            )}

            <View style={[styles.buttonRow, { flexDirection: flexRow }]}>
              <Button style={styles.flex} title={t('common.save')} onPress={savePartial} />
              <Button
                style={styles.flex}
                variant="ghost"
                title={t('common.cancel')}
                onPress={() => setPartialMode(false)}
              />
            </View>
          </View>
        ) : todayEntry ? (
          <ThemedText type="small" style={{ textAlign, color: theme.primary }}>
            {t('home.loggedToday', { label: t(`status.${todayEntry.status}`) })}
            {todayEntry.status === 'partial' ? ` (${todayEntry.verses})` : ''}
          </ThemedText>
        ) : null}
      </Card>

      <Card>
        <ThemedText style={[styles.heading, { textAlign }]}>{t('home.currentPosition')}</ThemedText>
        <ThemedText type="subtitle" style={[styles.position, { textAlign, color: theme.primary }]}>
          {projection.position ? formatPosition(projection.position, language) : t('home.notStarted')}
        </ThemedText>
        {projection.nextPosition ? (
          <InfoRow label={t('home.nextUp')} value={formatPosition(projection.nextPosition, language)} />
        ) : null}
      </Card>

      <Card>
        <ThemedText style={[styles.heading, { textAlign }]}>{t('home.progress')}</ThemedText>
        <ProgressBar percent={projection.percentComplete} />
        <View style={[styles.spread, { flexDirection: flexRow }]}>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            {t('home.versesOf', { done: projection.totalMemorized, total: TOTAL_AYAH })}
          </ThemedText>
          <ThemedText type="smallBold">{Math.round(projection.percentComplete)}%</ThemedText>
        </View>
      </Card>

      <Card>
        <ThemedText style={[styles.heading, { textAlign }]}>
          {t('home.projectionHeading')}
        </ThemedText>
        {projection.isComplete ? (
          <ThemedText style={{ textAlign, color: theme.success }}>{t('home.complete')}</ThemedText>
        ) : projection.projectedFinishDate ? (
          <View style={styles.projection}>
            <InfoRow label={t('home.projectedFinish')} value={projection.projectedFinishDate} emphasize />
            <InfoRow label={t('home.targetFinish')} value={projection.targetFinishDate} />
            <InfoRow
              label={t('home.pace')}
              value={t('templates.perDay', { n: Math.round(projection.ratePerDay ?? 0) })}
            />
            {renderStatusLine()}
          </View>
        ) : (
          <ThemedText style={{ textAlign, color: theme.textSecondary }}>
            {t('home.needProgress')}
          </ThemedText>
        )}
      </Card>

      <SurahPicker
        visible={surahPickerVisible}
        selected={posSurah}
        onSelect={onPickSurah}
        onClose={() => setSurahPickerVisible(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: Spacing.one,
  },
  titleRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  title: {
    fontSize: 32,
    lineHeight: 38,
    flexShrink: 1,
  },
  chevron: {
    fontSize: 28,
    fontWeight: '700',
  },
  headerMeta: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  heading: {
    fontWeight: '700',
    fontSize: 17,
  },
  position: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '700',
  },
  buttonRow: {
    gap: Spacing.two,
  },
  goalBox: {
    gap: Spacing.one,
  },
  flex: {
    flex: 1,
  },
  partialBox: {
    gap: Spacing.two,
  },
  segment: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.medium,
    padding: 2,
    gap: 2,
  },
  segmentItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.two,
    borderRadius: Radius.small,
  },
  posBox: {
    gap: Spacing.one,
  },
  selectField: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.medium,
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
  },
  flexShrink: {
    flexShrink: 1,
  },
  input: {
    minHeight: 48,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.medium,
    paddingHorizontal: Spacing.three,
    fontSize: 18,
  },
  spread: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  projection: {
    gap: Spacing.one,
  },
});
