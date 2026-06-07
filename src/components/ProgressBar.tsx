import { StyleSheet, View } from 'react-native';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface ProgressBarProps {
  percent: number;
  height?: number;
}

export function ProgressBar({ percent, height = 12 }: ProgressBarProps) {
  const theme = useTheme();
  const clamped = Math.max(0, Math.min(100, percent));

  return (
    <View
      style={[
        styles.track,
        { backgroundColor: theme.backgroundSelected, height, borderRadius: height / 2 },
      ]}>
      <View
        style={{
          width: `${clamped}%`,
          height,
          borderRadius: height / 2,
          backgroundColor: theme.primary,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
    borderRadius: Radius.pill,
  },
});
