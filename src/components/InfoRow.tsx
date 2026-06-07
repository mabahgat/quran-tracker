import { StyleSheet, Text, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useDirection } from '@/hooks/use-direction';
import { useTheme } from '@/hooks/use-theme';

interface InfoRowProps {
  label: string;
  value: string;
  emphasize?: boolean;
}

export function InfoRow({ label, value, emphasize }: InfoRowProps) {
  const theme = useTheme();
  const { flexRow, textAlign } = useDirection();

  return (
    <View style={[styles.row, { flexDirection: flexRow }]}>
      <Text style={[styles.label, { color: theme.textSecondary, textAlign }]}>{label}</Text>
      <Text
        style={[
          styles.value,
          { color: emphasize ? theme.primary : theme.text, textAlign, fontWeight: emphasize ? '800' : '600' },
        ]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingVertical: 2,
  },
  label: {
    fontSize: 15,
    flexShrink: 1,
  },
  value: {
    fontSize: 15,
    flexShrink: 1,
  },
});
