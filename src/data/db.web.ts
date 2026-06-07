import { newId } from '../utils/id';
import { createMemoryRepositories } from './repositories/memory';
import { Repositories } from './repositories/types';

/**
 * Web build of the storage layer. Web previews use the in-memory store so we
 * avoid bundling the SQLite WASM worker (which needs extra server headers).
 * Native platforms use db.ts (SQLite). Data here is not persisted across reloads.
 */
export async function initRepositories(): Promise<Repositories> {
  return createMemoryRepositories(newId);
}
