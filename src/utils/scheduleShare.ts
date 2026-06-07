import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';

/** Turns an arbitrary name into a safe file-name slug. */
function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

/** Safe CSV file name for a schedule. */
export function csvFileName(name: string): string {
  return `${slugify(name) || 'schedule'}.csv`;
}

/** Safe JSON file name for a plan export. */
export function planFileName(name: string): string {
  return `${slugify(name) || 'plan'}.plan.json`;
}

/**
 * Writes `content` to a temporary file and opens the native share sheet. On web,
 * where the share sheet is unavailable, falls back to a browser download.
 */
async function shareTextFile(
  fileName: string,
  content: string,
  mimeType: string,
  uti: string,
): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof document !== 'undefined') {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName;
      anchor.click();
      URL.revokeObjectURL(url);
    }
    return;
  }

  const file = new File(Paths.cache, fileName);
  if (file.exists) {
    file.delete();
  }
  file.create();
  file.write(content);

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, { mimeType, dialogTitle: fileName, UTI: uti });
  }
}

export interface PickedFile {
  content: string;
  /** Original file name (without extension), used as a default name. */
  name: string;
}

/** Opens the document picker, returning the chosen file's text and base name. */
async function pickTextFile(types: string[]): Promise<PickedFile | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: types, copyToCacheDirectory: true });
  if (result.canceled || result.assets.length === 0) {
    return null;
  }
  const asset = result.assets[0];
  const baseName = (asset.name ?? 'file').replace(/\.[^.]+$/, '');
  const content =
    Platform.OS === 'web'
      ? await (await fetch(asset.uri)).text()
      : await new File(asset.uri).text();
  return { content, name: baseName };
}

/** Shares schedule CSV text. */
export function shareCsv(fileName: string, content: string): Promise<void> {
  return shareTextFile(fileName, content, 'text/csv', 'public.comma-separated-values-text');
}

/** Picks a CSV file. */
export function pickCsv(): Promise<PickedFile | null> {
  return pickTextFile(['text/csv', 'text/comma-separated-values', 'text/plain', '*/*']);
}

/** Shares a plan-export JSON file. */
export function shareJson(fileName: string, content: string): Promise<void> {
  return shareTextFile(fileName, content, 'application/json', 'public.json');
}

/** Picks a JSON (plan export) file. */
export function pickJson(): Promise<PickedFile | null> {
  return pickTextFile(['application/json', 'text/plain', '*/*']);
}

/** @deprecated kept for backward compatibility; use {@link PickedFile}. */
export type PickedCsv = PickedFile;
