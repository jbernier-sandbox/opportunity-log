import { createInitialState, isAppState, type AppState } from './appState';

export const STORAGE_KEY = 'opportunity-log:state';

export type LoadResult =
  | { status: 'persistent'; state: AppState }
  | { status: 'temporary'; state: AppState; message: string }
  | { status: 'recovery-required'; state: AppState; message: string };

export type SaveResult = { ok: true } | { ok: false; message: string };

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function loadState(storage: StorageLike): LoadResult {
  let saved: string | null;
  try {
    saved = storage.getItem(STORAGE_KEY);
  } catch {
    return {
      status: 'temporary',
      state: createInitialState(),
      message:
        'Browser storage is unavailable. Changes in this temporary session will be lost.',
    };
  }

  if (saved === null)
    return { status: 'persistent', state: createInitialState() };

  try {
    const parsed: unknown = JSON.parse(saved);
    if (!isAppState(parsed)) {
      return {
        status: 'recovery-required',
        state: createInitialState(),
        message:
          'Saved application data is incompatible or corrupted. Reset application data to recover.',
      };
    }
    return { status: 'persistent', state: parsed };
  } catch {
    return {
      status: 'recovery-required',
      state: createInitialState(),
      message:
        'Saved application data is incompatible or corrupted. Reset application data to recover.',
    };
  }
}

export function saveState(storage: StorageLike, state: AppState): SaveResult {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
    return { ok: true };
  } catch {
    return {
      ok: false,
      message:
        'The change could not be saved. Existing data was preserved. Clear all application data and restart the prototype.',
    };
  }
}

export function clearState(storage: StorageLike): SaveResult {
  try {
    storage.removeItem(STORAGE_KEY);
    return { ok: true };
  } catch {
    return { ok: false, message: 'Application data could not be cleared.' };
  }
}
