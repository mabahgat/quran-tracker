import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';

/** Turns an arbitrary schedule name into a safe CSV file name. */
export function csvFileName(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return `${slug || 'schedule'}.csv`;
}

/**
 * Writes the CSV to a temporary file and opens the native share sheet. On web,
 * where the share sheet is unavailable, falls back to a browser download.
 */
export async function shareCsv(fileName: string, content: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof document !== 'undefined') {
      const blob = new Blob([content], { type: 'text/csv' });
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
    await Sharing.shareAsync(file.uri, {
      mimeType: 'text/csv',
      dialogTitle: fileName,
      UTI: 'public.comma-separated-values-text',
    });
  }
}

export interface PickedCsv {
  content: string;
  /** Original file name (without extension), used as a default schedule name. */
  name: string;
}

/**
 * Opens the document picker for a CSV and returns its text contents and file
 * name, or null if the user cancelled.
 */
export async function pickCsv(): Promise<PickedCsv | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['text/csv', 'text/comma-separated-values', 'text/plain', '*/*'],
    copyToCacheDirectory: true,
  });
  if (result.canceled || result.assets.length === 0) {
    return null;
  }
  const asset = result.assets[0];
  const baseName = (asset.name ?? 'schedule').replace(/\.[^.]+$/, '');
  const content =
    Platform.OS === 'web'
      ? await (await fetch(asset.uri)).text()
      : await new File(asset.uri).text();
  return { content, name: baseName };
}
