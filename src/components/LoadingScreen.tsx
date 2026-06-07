import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function LoadingScreen({ message }: { message?: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ActivityIndicator color={theme.primary} size="large" />
      {message ? <Text style={[styles.text, { color: theme.textSecondary }]}>{message}</Text> : null}
    </View>
  );
}

export function MessageScreen({ message, tone }: { message: string; tone?: 'danger' }) {
  const theme = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.text, { color: tone === 'danger' ? theme.danger : theme.text }]}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
    gap: Spacing.two,
  },
  text: {
    fontSize: 15,
    textAlign: 'center',
  },
});
