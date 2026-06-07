import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { LoadingScreen, MessageScreen } from '@/components/LoadingScreen';
import { ToastProvider } from '@/components/Toast';
import { WatchSync } from '@/components/WatchSync';
import { RepositoryProvider } from '@/data/RepositoryProvider';
import { useTheme } from '@/hooks/use-theme';
import { AppProvider } from '@/state/AppProvider';

function RootNavigator() {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.background },
        headerTitleStyle: { color: theme.text },
        headerTintColor: theme.primary,
        contentStyle: { backgroundColor: theme.background },
      }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="plans/new" options={{ title: t('newPlan.title'), presentation: 'modal' }} />
      <Stack.Screen name="plans/[id]" options={{ title: t('detail.title') }} />
      <Stack.Screen name="templates/[id]" options={{ title: t('schedule.title') }} />
      <Stack.Screen name="plan-log/[id]" options={{ title: t('log.planTitle') }} />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <RepositoryProvider
            fallback={<LoadingScreen />}
            errorFallback={(error) => <MessageScreen tone="danger" message={error.message} />}>
            <AppProvider fallback={<LoadingScreen />}>
              <ToastProvider>
                <RootNavigator />
                <WatchSync />
                <StatusBar style="auto" />
              </ToastProvider>
            </AppProvider>
          </RepositoryProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
