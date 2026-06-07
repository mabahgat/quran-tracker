import { CadenceTemplate, Plan, ProgressEntry, ProgressStatus, TemplateId } from '../../domain/types';

export interface NewPlan {
  name: string;
  templateId: TemplateId;
  startDate: string;
  dailyTarget: number;
  templateSnapshot: CadenceTemplate;
}

export type PlanChanges = Partial<
  Pick<Plan, 'name' | 'templateId' | 'startDate' | 'dailyTarget' | 'templateSnapshot'>
>;

export interface NewProgressEntry {
  planId: string;
  date: string;
  status: ProgressStatus;
  verses: number;
}

export interface PlanRepository {
  list(): Promise<Plan[]>;
  get(id: string): Promise<Plan | null>;
  getDefault(): Promise<Plan | null>;
  create(input: NewPlan): Promise<Plan>;
  update(id: string, changes: PlanChanges): Promise<Plan>;
  remove(id: string): Promise<void>;
  setDefault(id: string): Promise<void>;
}

export interface ProgressRepository {
  listByPlan(planId: string): Promise<ProgressEntry[]>;
  getByDate(planId: string, date: string): Promise<ProgressEntry | null>;
  upsert(input: NewProgressEntry): Promise<ProgressEntry>;
  remove(id: string): Promise<void>;
  removeByPlan(planId: string): Promise<void>;
}

export interface SettingsRepository {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
  all(): Promise<Record<string, string>>;
}

export interface Repositories {
  plans: PlanRepository;
  progress: ProgressRepository;
  settings: SettingsRepository;
}
