import { AppEvent, CadenceTemplate, ExplicitScheduleDay, Plan, ProgressEntry, ProgressStatus, TemplateId, UserSchedule } from '../../domain/types';
import { EventDraft } from '../../domain/events';

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

export type NewAppEvent = EventDraft;

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

export interface EventRepository {
  /** Activity log, most recent first. Optionally capped to `limit` rows. */
  list(limit?: number): Promise<AppEvent[]>;
  /** Events for a single plan, most recent first. Optionally capped to `limit`. */
  listByPlan(planId: string, limit?: number): Promise<AppEvent[]>;
  add(input: NewAppEvent): Promise<AppEvent>;
  /** Removes a single event from the activity log. */
  remove(id: string): Promise<void>;
  /** Clears the entire activity log. */
  clear(): Promise<void>;
}

export interface NewUserSchedule {
  name: string;
  source: string;
  days: ExplicitScheduleDay[];
}

export interface UserScheduleRepository {
  list(): Promise<UserSchedule[]>;
  get(id: string): Promise<UserSchedule | null>;
  create(input: NewUserSchedule): Promise<UserSchedule>;
  remove(id: string): Promise<void>;
}

export interface Repositories {
  plans: PlanRepository;
  progress: ProgressRepository;
  settings: SettingsRepository;
  events: EventRepository;
  userSchedules: UserScheduleRepository;
}
