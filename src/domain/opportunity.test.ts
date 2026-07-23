import {
  addOpportunityNote,
  assignOpportunity,
  availableTransitions,
  canAddNote,
  canEditCoreDetails,
  canEmployeeChangeStatus,
  canTransition,
  compareByDefaultOrder,
  createOpportunity,
  editOpportunity,
  formatOpportunityId,
  requiresTransitionReason,
  transitionOpportunity,
  validateNewOpportunity,
  type Opportunity,
} from './opportunity';

const NOW = '2026-07-22T15:00:00.000Z';
const MANAGER = {
  role: 'Manager',
  actor: 'Jamie Chen',
  now: NOW,
  entryId: 'event-1',
} as const;

function opportunity(overrides: Partial<Opportunity> = {}): Opportunity {
  return {
    ...createOpportunity(
      {
        title: 'Safer lift',
        description: 'Add a lift table',
        submitterName: 'Alex',
      },
      1,
      NOW,
    ),
    ...overrides,
  };
}

describe('opportunity domain', () => {
  it('creates trimmed, unassigned New opportunities with Medium priority', () => {
    const result = createOpportunity(
      {
        title: '  Safer lift ',
        description: ' Add a lift table ',
        submitterName: ' Alex ',
      },
      12,
      NOW,
    );

    expect(result).toMatchObject({
      id: 'OPP-0012',
      title: 'Safer lift',
      description: 'Add a lift table',
      submitterName: 'Alex',
      priority: 'Medium',
      status: 'New',
      assignee: null,
    });
  });

  it('formats identifiers and rejects invalid sequences', () => {
    expect(formatOpportunityId(10_000)).toBe('OPP-10000');
    expect(() => formatOpportunityId(0)).toThrow(/positive integer/i);
  });

  it('validates required fields and reasonable length limits', () => {
    expect(
      validateNewOpportunity({
        title: ' ',
        description: '',
        submitterName: 'x'.repeat(81),
      }),
    ).toEqual([
      { field: 'title', message: 'This field is required.' },
      { field: 'description', message: 'This field is required.' },
      { field: 'submitterName', message: 'Must be 80 characters or fewer.' },
    ]);
  });

  it('enforces transitions, assignment locks, and required terminal reasons', () => {
    expect(canTransition(opportunity(), 'Assigned')).toBe(false);
    expect(
      canTransition(opportunity({ assignee: 'Alex Morgan' }), 'Assigned'),
    ).toBe(true);
    expect(
      canTransition(
        opportunity({ status: 'Assigned', assignee: 'Alex Morgan' }),
        'Development',
      ),
    ).toBe(true);
    expect(
      canTransition(
        opportunity({ status: 'Development', assignee: null }),
        'Pending Release',
      ),
    ).toBe(false);
    expect(
      canTransition(
        opportunity({ status: 'Pending Release', assignee: 'Alex Morgan' }),
        'Released',
      ),
    ).toBe(true);
    expect(
      canTransition(
        opportunity({ status: 'Pending Release', assignee: 'Alex Morgan' }),
        'Development',
      ),
    ).toBe(true);
    expect(
      canTransition(
        opportunity({ status: 'Development', assignee: 'Alex Morgan' }),
        'Assigned',
      ),
    ).toBe(true);
    expect(
      canTransition(
        opportunity({ status: 'Assigned', assignee: 'Alex Morgan' }),
        'New',
      ),
    ).toBe(true);
    expect(
      canTransition(
        opportunity({ status: 'Released', assignee: 'Alex Morgan' }),
        'Complete',
      ),
    ).toBe(true);
    expect(
      canTransition(
        opportunity({ status: 'Complete', assignee: 'Alex Morgan' }),
        'Archived',
      ),
    ).toBe(true);
    expect(
      canTransition(
        opportunity({ status: 'Complete', assignee: 'Alex Morgan' }),
        'Canceled',
      ),
    ).toBe(true);
    expect(
      canTransition(
        opportunity({ status: 'Archived', assignee: 'Alex Morgan' }),
        'New',
      ),
    ).toBe(false);
    expect(requiresTransitionReason('Canceled')).toBe(true);
    expect(requiresTransitionReason('Rejected')).toBe(true);
    expect(requiresTransitionReason('Archived')).toBe(false);
  });

  it('enforces employee and terminal-status permissions', () => {
    expect(
      canEmployeeChangeStatus(opportunity({ assignee: 'Alex Morgan' })),
    ).toBe(true);
    expect(
      canEmployeeChangeStatus(opportunity({ assignee: 'Jamie Chen' })),
    ).toBe(false);
    expect(
      canAddNote(opportunity({ assignee: 'Alex Morgan' }), 'Employee'),
    ).toBe(true);
    expect(
      canAddNote(
        opportunity({ status: 'Rejected', assignee: 'Alex Morgan' }),
        'Employee',
      ),
    ).toBe(false);
    expect(canAddNote(opportunity({ status: 'Rejected' }), 'Manager')).toBe(
      true,
    );
    expect(canEditCoreDetails(opportunity(), 'Employee')).toBe(false);
    expect(canEditCoreDetails(opportunity(), 'Manager')).toBe(true);
    expect(
      canEditCoreDetails(opportunity({ status: 'Archived' }), 'Manager'),
    ).toBe(false);
  });

  it('sorts by priority, then oldest first, then sequence', () => {
    const items = [
      opportunity({
        sequence: 3,
        priority: 'Low',
        createdAt: '2026-01-01T00:00:00Z',
      }),
      opportunity({
        sequence: 2,
        priority: 'High',
        createdAt: '2026-02-01T00:00:00Z',
      }),
      opportunity({
        sequence: 1,
        priority: 'High',
        createdAt: '2026-01-01T00:00:00Z',
      }),
    ];
    expect(
      items.sort(compareByDefaultOrder).map(({ sequence }) => sequence),
    ).toEqual([1, 2, 3]);
  });

  it('edits manager-controlled fields and records each changed value', () => {
    const original = opportunity();
    const result = editOpportunity(
      original,
      {
        title: 'Safer lift station',
        description: original.description,
        priority: 'High',
      },
      MANAGER,
    );
    expect(result).toMatchObject({
      title: 'Safer lift station',
      priority: 'High',
    });
    expect(result.history[0]?.changes).toEqual([
      {
        field: 'title',
        previousValue: 'Safer lift',
        newValue: 'Safer lift station',
      },
      { field: 'priority', previousValue: 'Medium', newValue: 'High' },
    ]);
    expect(() =>
      editOpportunity(
        original,
        { title: 'x', description: 'y', priority: 'Low' },
        { ...MANAGER, role: 'Employee' },
      ),
    ).toThrow(/cannot be edited/i);
    expect(original.title).toBe('Safer lift');
  });

  it('enforces manager assignment and narrow employee self-assignment', () => {
    const original = opportunity();
    expect(assignOpportunity(original, 'Priya Patel', MANAGER).assignee).toBe(
      'Priya Patel',
    );
    expect(
      assignOpportunity(original, 'Alex Morgan', {
        ...MANAGER,
        role: 'Employee',
        actor: 'Alex Morgan',
      }).assignee,
    ).toBe('Alex Morgan');
    expect(() =>
      assignOpportunity(
        opportunity({ status: 'Assigned', assignee: 'Jamie Chen' }),
        'Alex Morgan',
        { ...MANAGER, role: 'Employee', actor: 'Alex Morgan' },
      ),
    ).toThrow(/self-assign/i);
    expect(() =>
      assignOpportunity(opportunity({ status: 'Archived' }), null, MANAGER),
    ).toThrow(/terminal/i);
  });

  it('couples assignment and Assigned/New status with separate activity entries', () => {
    const assigned = assignOpportunity(
      opportunity({ status: 'New', assignee: null }),
      'Priya Patel',
      MANAGER,
    );
    expect(assigned.status).toBe('Assigned');
    expect(assigned.history.slice(-2).map((entry) => entry.action)).toEqual([
      'assigned',
      'status_changed',
    ]);

    const cleared = assignOpportunity(assigned, null, {
      ...MANAGER,
      entryId: 'history-2',
    });
    expect(cleared.status).toBe('New');
    expect(cleared.history.slice(-2).map((entry) => entry.action)).toEqual([
      'assigned',
      'status_changed',
    ]);

    for (const status of [
      'Development',
      'Pending Release',
      'Released',
    ] as const) {
      expect(() =>
        assignOpportunity(
          opportunity({ status, assignee: 'Alex Morgan' }),
          null,
          MANAGER,
        ),
      ).toThrow(/cannot be unassigned/i);
    }
  });

  it('adds append-only notes according to role, assignment, and terminal rules', () => {
    const assigned = opportunity({ assignee: 'Alex Morgan' });
    const employee = {
      ...MANAGER,
      role: 'Employee',
      actor: 'Alex Morgan',
    } as const;
    expect(
      addOpportunityNote(assigned, '  Checked clearance. ', employee).notes[0]
        ?.body,
    ).toBe('Checked clearance.');
    expect(() => addOpportunityNote(opportunity(), 'Note', employee)).toThrow(
      /cannot add/i,
    );
    expect(
      addOpportunityNote(
        opportunity({ status: 'Rejected' }),
        'Manager follow-up',
        MANAGER,
      ).notes,
    ).toHaveLength(1);
    expect(() => addOpportunityNote(assigned, ' ', employee)).toThrow(
      /required/i,
    );
  });

  it('returns only role-valid transitions and requires cancel or reject reasons', () => {
    const assigned = opportunity({
      status: 'Assigned',
      assignee: 'Alex Morgan',
    });
    expect(availableTransitions(assigned, 'Employee')).toEqual([
      'New',
      'Development',
      'Canceled',
      'Rejected',
    ]);
    expect(
      availableTransitions({ ...assigned, assignee: 'Jamie Chen' }, 'Employee'),
    ).toEqual([]);
    expect(() =>
      transitionOpportunity(assigned, 'Canceled', '', MANAGER),
    ).toThrow(/reason is required/i);
    const result = transitionOpportunity(
      assigned,
      'Canceled',
      'No longer needed',
      MANAGER,
    );
    expect(result.status).toBe('Canceled');
    expect(result.history[0]).toMatchObject({
      action: 'status_changed',
      reason: 'No longer needed',
    });
  });

  it('returns Assigned work to New and removes its assignee atomically', () => {
    const result = transitionOpportunity(
      opportunity({ status: 'Assigned', assignee: 'Jamie Chen' }),
      'New',
      '',
      MANAGER,
    );

    expect(result).toMatchObject({ status: 'New', assignee: null });
    expect(result.history.map((entry) => entry.action)).toEqual([
      'status_changed',
      'assigned',
    ]);
    expect(result.history[1]?.changes).toEqual([
      {
        field: 'assignee',
        previousValue: 'Jamie Chen',
        newValue: null,
      },
    ]);
  });
});
