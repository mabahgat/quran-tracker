import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { I18nManager } from 'react-native';

import { useRepositories } from '@/data/RepositoryProvider';
import { NewUserSchedule } from '@/data/repositories/types';
import {
  planCreatedEvent,
  planDeletedEvent,
  planRenamedEvent,
  planSetDefaultEvent,
  planTemplateChangedEvent,
} from '@/domain/events';
import { getTemplate, TEMPLATES } from '@/domain/templates';
import { userScheduleToTemplate } from '@/domain/userSchedule';
import { CadenceTemplate, Plan, TemplateId, UserSchedule } from '@/domain/types';
import { detectDeviceLanguage, initI18n, isRTL, Language } from '@/i18n';
import { todayISO } from '@/utils/date';
import { templateNameOf } from '@/utils/format';

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
  /** Built-in templates plus the user's saved schedules, for the cadence pickers. */
  templates: CadenceTemplate[];
  userSchedules: UserSchedule[];
  /** Localized display name for any template id (built-in or user-defined). */
  templateLabel: (id: TemplateId) => string;
  refreshPlans: () => Promise<void>;
  createPlan: (input: CreatePlanInput) => Promise<Plan>;
  renamePlan: (id: string, name: string) => Promise<void>;
  changePlanTemplate: (id: string, templateId: TemplateId) => Promise<void>;
  deletePlan: (id: string) => Promise<void>;
  setDefaultPlan: (id: string) => Promise<void>;
  importSchedule: (input: NewUserSchedule) => Promise<UserSchedule>;
  deleteUserSchedule: (id: string) => Promise<void>;
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
  const [userSchedules, setUserSchedules] = useState<UserSchedule[]>([]);

  const refreshPlans = useCallback(async () => {
    const [list, def] = await Promise.all([
      repositories.plans.list(),
      repositories.plans.getDefault(),
    ]);
    setPlans(list);
    setDefaultPlanState(def);
  }, [repositories]);

  const refreshUserSchedules = useCallback(async () => {
    setUserSchedules(await repositories.userSchedules.list());
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
      await Promise.all([refreshPlans(), refreshUserSchedules()]);
      if (active) setReady(true);
    })();
    return () => {
      active = false;
    };
  }, [repositories, refreshPlans, refreshUserSchedules]);

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

  const templates = useMemo<CadenceTemplate[]>(
    () => [...TEMPLATES, ...userSchedules.map(userScheduleToTemplate)],
    [userSchedules],
  );

  const templateLabel = useCallback(
    (id: TemplateId) => {
      const template = templates.find((t) => t.id === id);
      return template ? templateNameOf(template, language) : id;
    },
    [templates, language],
  );

  // Resolves the full template definition for a plan snapshot, reading a
  // user-defined schedule straight from storage so it is never stale.
  const resolveTemplate = useCallback(
    async (id: TemplateId): Promise<CadenceTemplate> => {
      const userSchedule = await repositories.userSchedules.get(id);
      if (userSchedule) return userScheduleToTemplate(userSchedule);
      return getTemplate(id);
    },
    [repositories],
  );

  const createPlan = useCallback(
    async (input: CreatePlanInput) => {
      const snapshot = await resolveTemplate(input.templateId);
      const plan = await repositories.plans.create({
        name: input.name.trim(),
        templateId: input.templateId,
        startDate: input.startDate ?? todayISO(),
        dailyTarget: snapshot.dailyTarget,
        templateSnapshot: snapshot,
      });
      await repositories.events.add(planCreatedEvent(plan));
      const existingDefault = await repositories.plans.getDefault();
      if (!existingDefault) {
        await repositories.plans.setDefault(plan.id);
      }
      await refreshPlans();
      return plan;
    },
    [repositories, refreshPlans, resolveTemplate],
  );

  const renamePlan = useCallback(
    async (id: string, name: string) => {
      const existing = await repositories.plans.get(id);
      const updated = await repositories.plans.update(id, { name: name.trim() });
      if (existing && existing.name !== updated.name) {
        await repositories.events.add(planRenamedEvent(updated, existing.name, updated.name));
      }
      await refreshPlans();
    },
    [repositories, refreshPlans],
  );

  const changePlanTemplate = useCallback(
    async (id: string, templateId: TemplateId) => {
      const existing = await repositories.plans.get(id);
      const snapshot = await resolveTemplate(templateId);
      const updated = await repositories.plans.update(id, {
        templateId,
        dailyTarget: snapshot.dailyTarget,
        templateSnapshot: snapshot,
      });
      if (existing && existing.templateId !== templateId) {
        await repositories.events.add(
          planTemplateChangedEvent(updated, existing.templateId, templateId),
        );
      }
      await refreshPlans();
    },
    [repositories, refreshPlans, resolveTemplate],
  );

  const deletePlan = useCallback(
    async (id: string) => {
      const target = await repositories.plans.get(id);
      const wasDefault = target?.isDefault ?? false;
      await repositories.progress.removeByPlan(id);
      await repositories.plans.remove(id);
      if (target) {
        await repositories.events.add(planDeletedEvent(target));
      }
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
      const plan = await repositories.plans.get(id);
      if (plan) {
        await repositories.events.add(planSetDefaultEvent(plan));
      }
      await refreshPlans();
    },
    [repositories, refreshPlans],
  );

  const importSchedule = useCallback(
    async (input: NewUserSchedule) => {
      const schedule = await repositories.userSchedules.create(input);
      await refreshUserSchedules();
      return schedule;
    },
    [repositories, refreshUserSchedules],
  );

  const deleteUserSchedule = useCallback(
    async (id: string) => {
      await repositories.userSchedules.remove(id);
      await refreshUserSchedules();
    },
    [repositories, refreshUserSchedules],
  );

  const value = useMemo<AppContextValue>(
    () => ({
      language,
      isRTL: isRTL(language),
      setLanguage,
      plans,
      defaultPlan,
      templates,
      userSchedules,
      templateLabel,
      refreshPlans,
      createPlan,
      renamePlan,
      changePlanTemplate,
      deletePlan,
      setDefaultPlan,
      importSchedule,
      deleteUserSchedule,
    }),
    [language, setLanguage, plans, defaultPlan, templates, userSchedules, templateLabel, refreshPlans, createPlan, renamePlan, changePlanTemplate, deletePlan, setDefaultPlan, importSchedule, deleteUserSchedule],
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
