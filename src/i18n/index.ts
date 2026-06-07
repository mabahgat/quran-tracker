import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import ar from './ar.json';
import en from './en.json';

export const LANGUAGES = ['en', 'ar'] as const;
export type Language = (typeof LANGUAGES)[number];

export function isRTL(language: string): boolean {
  return language === 'ar';
}

export function detectDeviceLanguage(): Language {
  try {
    const code = getLocales()?.[0]?.languageCode ?? 'en';
    return code === 'ar' ? 'ar' : 'en';
  } catch {
    return 'en';
  }
}

export async function initI18n(language: Language): Promise<typeof i18n> {
  if (!i18n.isInitialized) {
    await i18n.use(initReactI18next).init({
      resources: {
        en: { translation: en },
        ar: { translation: ar },
      },
      lng: language,
      fallbackLng: 'en',
      interpolation: { escapeValue: false },
      returnNull: false,
    });
  } else if (i18n.language !== language) {
    await i18n.changeLanguage(language);
  }
  return i18n;
}

export default i18n;
