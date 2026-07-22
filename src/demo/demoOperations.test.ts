import { createOpportunity } from '../domain/opportunity';
import { createInitialState } from '../persistence/appState';
import {
  clearAllData,
  loadSampleData,
  moveInCustomOrder,
  orderOpportunities,
} from './demoOperations';

describe('Phase 5 demo operations', () => {
  it('loads additive sample data once and records an application audit event', () => {
    const existing = createOpportunity(
      { title: 'Existing', description: 'Keep me', submitterName: 'Alex' },
      1,
      '2026-07-22T10:00:00.000Z',
    );
    const state = {
      ...createInitialState(),
      opportunities: [existing],
      nextOpportunitySequence: 2,
    };

    const first = loadSampleData(state, '2026-07-22T11:00:00.000Z', 'Manager');
    const second = loadSampleData(first, '2026-07-22T12:00:00.000Z', 'Manager');

    expect(first.opportunities[0]).toEqual(existing);
    expect(second.opportunities).toHaveLength(first.opportunities.length);
    expect(
      new Set(second.opportunities.map((item) => item.sampleKey)).size,
    ).toBeGreaterThan(1);
    expect(first.auditEvents.at(-1)?.action).toBe('sample_data_loaded');
  });

  it('keeps manager ordering deterministic and rejects employee ordering', () => {
    const a = createOpportunity(
      { title: 'A', description: 'A', submitterName: 'Alex' },
      1,
      '2026-07-22T10:00:00.000Z',
    );
    const b = createOpportunity(
      { title: 'B', description: 'B', submitterName: 'Alex' },
      2,
      '2026-07-22T11:00:00.000Z',
    );
    const order = moveInCustomOrder([a.id, b.id], b.id, -1, 'Manager');
    expect(order).toEqual([b.id, a.id]);
    expect(orderOpportunities([a, b], order).map((item) => item.id)).toEqual([
      b.id,
      a.id,
    ]);
    expect(() => moveInCustomOrder([a.id, b.id], b.id, -1, 'Employee')).toThrow(
      /manager/i,
    );
  });

  it('clear all returns exact first-launch state and retains no audit event', () => {
    const dirty = {
      ...createInitialState(),
      auditEvents: [
        {
          id: 'audit-1',
          action: 'login' as const,
          actor: 'Alex',
          createdAt: '2026-07-22T10:00:00.000Z',
        },
      ],
      customOrder: { New: ['OPP-0001'] },
      preferences: { welcomeDismissed: true },
    };
    expect(clearAllData(dirty, 'Manager')).toEqual(createInitialState());
    expect(clearAllData(dirty, 'Manager').auditEvents).toEqual([]);
    expect(() => clearAllData(dirty, 'Employee')).toThrow(/manager/i);
    expect(() =>
      loadSampleData(dirty, '2026-07-22T12:00:00.000Z', 'Employee'),
    ).toThrow(/manager/i);
  });
});
