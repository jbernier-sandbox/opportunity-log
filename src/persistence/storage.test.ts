import { createOpportunity } from '../domain/opportunity';
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

  it('migrates Jamie-authored actions to Alex without changing assignments', () => {
    const storage = memoryStorage();
    const state = createInitialState();
    const item = createOpportunity(
      { title: 'Labels', description: 'Improve labels', submitterName: 'Alex' },
      1,
      '2026-07-22T12:00:00.000Z',
    );
    item.assignee = 'Jamie Chen';
    item.notes = [
      {
        id: 'n1',
        body: 'Review',
        author: 'Jamie Chen',
        role: 'Manager',
        createdAt: item.createdAt,
      },
    ];
    item.history = [
      {
        id: 'h1',
        action: 'edited',
        actor: 'Jamie Chen',
        role: 'Manager',
        createdAt: item.createdAt,
      },
    ];
    state.opportunities = [item];
    state.auditEvents = [
      {
        id: 'a1',
        action: 'login',
        actor: 'Jamie Chen',
        createdAt: item.createdAt,
      },
    ];
    storage.setItem(STORAGE_KEY, JSON.stringify(state));

    const result = loadState(storage);
    expect(result.state.opportunities[0]?.assignee).toBe('Jamie Chen');
    expect(result.state.opportunities[0]?.notes[0]?.author).toBe('Alex Morgan');
    expect(result.state.opportunities[0]?.history[0]?.actor).toBe(
      'Alex Morgan',
    );
    expect(result.state.auditEvents[0]?.actor).toBe('Alex Morgan');
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
