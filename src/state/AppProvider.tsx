import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { I18nManager } from 'react-native';

import { useRepositories } from '@/data/RepositoryProvider';
import { getTemplate } from '@/domain/templates';
import { Plan, TemplateId } from '@/domain/types';
import { detectDeviceLanguage, initI18n, isRTL, Language } from '@/i18n';
import { todayISO } from '@/utils/date';

interface CreatePlanInput {
  name: string;
  templateId: TemplateId;
  startDate?: string;
}

interface AppContextValue {
  language: Language;
  isRTL: boolean;
  setLanguage: (language: Language) => Promise<boolean>;
  plans: Plan[];
  defaultPlan: Plan | null;
  refreshPlans: () => Promise<void>;
  createPlan: (input: CreatePlanInput) => Promise<Plan>;
  renamePlan: (id: string, name: string) => Promise<void>;
  changePlanTemplate: (id: string, templateId: TemplateId) => Promise<void>;
  deletePlan: (id: string) => Promise<void>;
  setDefaultPlan: (id: string) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({
  children,
  fallback,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const repositories = useRepositories();
  const [ready, setReady] = useState(false);
  const [language, setLanguageState] = useState<Language>('en');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [defaultPlan, setDefaultPlanState] = useState<Plan | null>(null);

  const refreshPlans = useCallback(async () => {
    const [list, def] = await Promise.all([
      repositories.plans.list(),
      repositories.plans.getDefault(),
    ]);
    setPlans(list);
    setDefaultPlanState(def);
  }, [repositories]);

  useEffect(() => {
    let active = true;
    (async () => {
      const stored = (await repositories.settings.get('language')) as Language | null;
      const lang = stored ?? detectDeviceLanguage();
      await initI18n(lang);
      I18nManager.allowRTL(true);
      if (I18nManager.isRTL !== isRTL(lang)) {
        I18nManager.forceRTL(isRTL(lang));
      }
      if (!active) return;
      setLanguageState(lang);
      await refreshPlans();
      if (active) setReady(true);
    })();
    return () => {
      active = false;
    };
  }, [repositories, refreshPlans]);

  const setLanguage = useCallback(
    async (next: Language) => {
      await repositories.settings.set('language', next);
      await initI18n(next);
      setLanguageState(next);
      const directionChanged = I18nManager.isRTL !== isRTL(next);
      if (directionChanged) {
        I18nManager.allowRTL(true);
        I18nManager.forceRTL(isRTL(next));
      }
      return directionChanged;
    },
    [repositories],
  );

  const createPlan = useCallback(
    async (input: CreatePlanInput) => {
      const snapshot = getTemplate(input.templateId);
      const plan = await repositories.plans.create({
        name: input.name.trim(),
        templateId: input.templateId,
        startDate: input.startDate ?? todayISO(),
        dailyTarget: snapshot.dailyTarget,
        templateSnapshot: snapshot,
      });
      const existingDefault = await repositories.plans.getDefault();
      if (!existingDefault) {
        await repositories.plans.setDefault(plan.id);
      }
      await refreshPlans();
      return plan;
    },
    [repositories, refreshPlans],
  );

  const renamePlan = useCallback(
    async (id: string, name: string) => {
      await repositories.plans.update(id, { name: name.trim() });
      await refreshPlans();
    },
    [repositories, refreshPlans],
  );

  const changePlanTemplate = useCallback(
    async (id: string, templateId: TemplateId) => {
      const snapshot = getTemplate(templateId);
      await repositories.plans.update(id, {
        templateId,
        dailyTarget: snapshot.dailyTarget,
        templateSnapshot: snapshot,
      });
      await refreshPlans();
    },
    [repositories, refreshPlans],
  );

  const deletePlan = useCallback(
    async (id: string) => {
      const wasDefault = (await repositories.plans.get(id))?.isDefault ?? false;
      await repositories.progress.removeByPlan(id);
      await repositories.plans.remove(id);
      if (wasDefault) {
        const remaining = await repositories.plans.list();
        if (remaining.length > 0) {
          await repositories.plans.setDefault(remaining[0].id);
        }
      }
      await refreshPlans();
    },
    [repositories, refreshPlans],
  );

  const setDefaultPlan = useCallback(
    async (id: string) => {
      await repositories.plans.setDefault(id);
      await refreshPlans();
    },
    [repositories, refreshPlans],
  );

  const value = useMemo<AppContextValue>(
    () => ({
      language,
      isRTL: isRTL(language),
      setLanguage,
      plans,
      defaultPlan,
      refreshPlans,
      createPlan,
      renamePlan,
      changePlanTemplate,
      deletePlan,
      setDefaultPlan,
    }),
    [language, setLanguage, plans, defaultPlan, refreshPlans, createPlan, renamePlan, changePlanTemplate, deletePlan, setDefaultPlan],
  );

  if (!ready) {
    return <>{fallback ?? null}</>;
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return ctx;
}
