import template10Days from '../resources/templates/10-days.json';
import template1Month from '../resources/templates/1-month.json';
import template2Months from '../resources/templates/2-months.json';
import template3Months from '../resources/templates/3-months.json';
import template100Days from '../resources/templates/100-days.json';
import templateIncremental100Days from '../resources/templates/incremental-100-days.json';
import template6Months from '../resources/templates/6-months.json';
import templateIncremental6Months from '../resources/templates/incremental-6-months.json';
import template1Year from '../resources/templates/1-year.json';
import templateIncremental1Year from '../resources/templates/incremental-1-year.json';
import template2Years from '../resources/templates/2-years.json';
import { TOTAL_AYAH } from './quran';
import { CadenceTemplate, TemplateId, TemplateKind } from './types';

const TEMPLATE_IDS: readonly TemplateId[] = [
  '10-days',
  '1-month',
  '2-months',
  '3-months',
  '100-days',
  'incremental-100-days',
  '6-months',
  'incremental-6-months',
  '1-year',
  'incremental-1-year',
  '2-years',
];

const RAW_TEMPLATES = [
  template10Days,
  template1Month,
  template2Months,
  template3Months,
  template100Days,
  templateIncremental100Days,
  template6Months,
  templateIncremental6Months,
  template1Year,
  templateIncremental1Year,
  template2Years,
];

function isTemplateId(value: unknown): value is TemplateId {
  return typeof value === 'string' && (TEMPLATE_IDS as readonly string[]).includes(value);
}

function isTemplateKind(value: unknown): value is TemplateKind {
  return value === 'computed' || value === 'scheduled';
}

/**
 * Loads and validates a single template resource. Throws on malformed data so a
 * broken resource file fails fast at startup instead of corrupting projections.
 */
function parseTemplate(raw: unknown): CadenceTemplate {
  const record = raw as Record<string, unknown>;
  if (!isTemplateId(record.id)) {
    throw new Error(`Template resource has an invalid id: ${String(record.id)}`);
  }
  if (!isTemplateKind(record.kind)) {
    throw new Error(`Template ${record.id} has an invalid kind: ${String(record.kind)}`);
  }
  const names = record.names as Record<string, unknown> | undefined;
  if (!names || typeof names.en !== 'string' || typeof names.ar !== 'string') {
    throw new Error(`Template ${record.id} is missing localized names`);
  }
  const { durationDays, dailyTarget, totalVerses } = record;
  if (typeof durationDays !== 'number' || !Number.isInteger(durationDays) || durationDays <= 0) {
    throw new Error(`Template ${record.id} has an invalid durationDays`);
  }
  if (typeof dailyTarget !== 'number' || !Number.isInteger(dailyTarget) || dailyTarget <= 0) {
    throw new Error(`Template ${record.id} has an invalid dailyTarget`);
  }
  if (totalVerses !== TOTAL_AYAH) {
    throw new Error(
      `Template ${record.id} totalVerses (${String(totalVerses)}) does not match the Quran total (${TOTAL_AYAH})`,
    );
  }
  return {
    id: record.id,
    kind: record.kind,
    names: { en: names.en, ar: names.ar },
    durationDays,
    dailyTarget,
    totalVerses,
  };
}

/**
 * Loads, validates and orders every template resource. The list is derived
 * entirely from the JSON files (sorted by duration, with the computed variant
 * before the scheduled one when they share a duration) so edits to the resources
 * — including names — are reflected in the app on the next startup.
 */
function loadTemplates(): CadenceTemplate[] {
  const parsed = RAW_TEMPLATES.map(parseTemplate);
  const seen = new Set<string>();
  for (const template of parsed) {
    if (seen.has(template.id)) {
      throw new Error(`Duplicate template resource id: ${template.id}`);
    }
    seen.add(template.id);
  }
  const kindRank = (kind: TemplateKind) => (kind === 'computed' ? 0 : 1);
  return [...parsed].sort((a, b) =>
    a.durationDays !== b.durationDays
      ? a.durationDays - b.durationDays
      : kindRank(a.kind) - kindRank(b.kind),
  );
}

export const TEMPLATES: readonly CadenceTemplate[] = loadTemplates();

export function getTemplate(id: TemplateId): CadenceTemplate {
  const template = TEMPLATES.find((t) => t.id === id);
  if (!template) {
    throw new Error(`Unknown template id: ${id}`);
  }
  return template;
}

export function dailyTargetFor(id: TemplateId): number {
  return getTemplate(id).dailyTarget;
}
