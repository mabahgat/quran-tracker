import { useTranslation } from 'react-i18next';
import { FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { SURAHS } from '@/domain/quranData';
import { useDirection } from '@/hooks/use-direction';
import { useTheme } from '@/hooks/use-theme';
import { surahName } from '@/utils/format';

interface SurahPickerProps {
  visible: boolean;
  selected: number;
  onSelect: (surahNumber: number) => void;
  onClose: () => void;
}

export function SurahPicker({ visible, selected, onSelect, onClose }: SurahPickerProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { textAlign, flexRow, language } = useDirection();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: theme.background }]}>
          <View style={[styles.header, { flexDirection: flexRow, borderColor: theme.border }]}>
            <ThemedText style={[styles.title, { textAlign }]}>{t('home.selectSurahTitle')}</ThemedText>
            <Button variant="ghost" title={t('common.cancel')} onPress={onClose} />
          </View>
          <FlatList
            data={SURAHS}
            keyExtractor={(item) => String(item.number)}
            initialNumToRender={20}
            getItemLayout={(_, index) => ({ length: 56, offset: 56 * index, index })}
            renderItem={({ item }) => {
              const isSelected = item.number === selected;
              return (
                <Pressable
                  onPress={() => {
                    onSelect(item.number);
                    onClose();
                  }}
                  style={[
                    styles.row,
                    {
                      flexDirection: flexRow,
                      borderColor: theme.border,
                      backgroundColor: isSelected ? theme.backgroundSelected : 'transparent',
                    },
                  ]}>
                  <View style={[styles.numberBadge, { backgroundColor: theme.backgroundElement }]}>
                    <ThemedText type="smallBold" style={{ color: theme.primary }}>
                      {item.number}
                    </ThemedText>
                  </View>
                  <View style={styles.flexShrink}>
                    <ThemedText style={[styles.name, { textAlign }]}>
                      {surahName(item, language)}
                    </ThemedText>
                    <ThemedText type="small" style={{ textAlign, color: theme.textSecondary }}>
                      {t('home.ayahCount', { n: item.ayahCount })}
                    </ThemedText>
                  </View>
                  {isSelected ? (
                    <ThemedText style={{ color: theme.primary, fontSize: 18 }}>●</ThemedText>
                  ) : null}
                </Pressable>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    maxHeight: '80%',
    borderTopLeftRadius: Radius.large,
    borderTopRightRadius: Radius.large,
    paddingBottom: Spacing.four,
  },
  header: {
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    flexShrink: 1,
  },
  row: {
    alignItems: 'center',
    gap: Spacing.three,
    height: 56,
    paddingHorizontal: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  numberBadge: {
    width: 32,
    height: 32,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
  },
  flexShrink: {
    flexShrink: 1,
    flexGrow: 1,
  },
});
