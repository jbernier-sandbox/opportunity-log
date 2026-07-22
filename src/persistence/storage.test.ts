import { createInitialState, SCHEMA_VERSION } from './appState';
import {
  clearState,
  loadState,
  saveState,
  STORAGE_KEY,
  type StorageLike,
} from './storage';

function memoryStorage(): StorageLike & { values: Map<string, string> } {
  const values = new Map<string, string>();
  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
    removeItem: (key) => {
      values.delete(key);
    },
  };
}

describe('versioned persistence', () => {
  it('starts empty and round-trips valid state', () => {
    const storage = memoryStorage();
    expect(loadState(storage)).toEqual({
      status: 'persistent',
      state: createInitialState(),
    });
    const state = { ...createInitialState(), nextOpportunitySequence: 7 };
    expect(saveState(storage, state)).toEqual({ ok: true });
    expect(loadState(storage)).toEqual({ status: 'persistent', state });
  });

  it.each([
    ['invalid JSON', '{'],
    [
      'an old schema',
      JSON.stringify({
        ...createInitialState(),
        schemaVersion: SCHEMA_VERSION + 1,
      }),
    ],
  ])('offers reset recovery for %s', (_label, value) => {
    const storage = memoryStorage();
    storage.values.set(STORAGE_KEY, value);
    const result = loadState(storage);
    expect(result.status).toBe('recovery-required');
    if (result.status !== 'persistent') {
      expect(result.message).toMatch(/reset application data/i);
    }
  });

  it('rejects structurally corrupted opportunity records', () => {
    const storage = memoryStorage();
    storage.values.set(
      STORAGE_KEY,
      JSON.stringify({
        ...createInitialState(),
        opportunities: [{ id: 'OPP-0001', status: 'Unknown' }],
      }),
    );
    expect(loadState(storage).status).toBe('recovery-required');
  });

  it('falls back to a clearly identified temporary session when reads fail', () => {
    const storage = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {},
      removeItem: () => {},
    };
    const result = loadState(storage);
    expect(result.status).toBe('temporary');
    if (result.status !== 'persistent') {
      expect(result.message).toMatch(/will be lost/i);
    }
  });

  it('preserves existing data and recommends clearing data when saving fails', () => {
    const storage = memoryStorage();
    storage.values.set(STORAGE_KEY, 'existing');
    storage.setItem = () => {
      throw new DOMException('full', 'QuotaExceededError');
    };
    const result = saveState(storage, createInitialState());
    expect(result).toEqual(expect.objectContaining({ ok: false }));
    if (!result.ok) {
      expect(result.message).toMatch(/clear all application data and restart/i);
    }
    expect(storage.values.get(STORAGE_KEY)).toBe('existing');
  });

  it('clears persisted state without mutating the initial-state contract', () => {
    const storage = memoryStorage();
    storage.values.set(STORAGE_KEY, '{}');
    expect(clearState(storage)).toEqual({ ok: true });
    expect(storage.values.has(STORAGE_KEY)).toBe(false);
    expect(createInitialState()).toEqual(
      expect.objectContaining({
        opportunities: [],
        nextOpportunitySequence: 1,
      }),
    );
  });
});
