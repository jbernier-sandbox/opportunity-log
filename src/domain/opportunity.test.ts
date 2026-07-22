import {
  canAddNote,
  canEditCoreDetails,
  canEmployeeChangeStatus,
  canTransition,
  compareByDefaultOrder,
  createOpportunity,
  formatOpportunityId,
  requiresTransitionReason,
  validateNewOpportunity,
  type Opportunity,
} from './opportunity';

const NOW = '2026-07-22T15:00:00.000Z';

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
        'Implemented',
      ),
    ).toBe(false);
    expect(
      canTransition(
        opportunity({ status: 'Implemented', assignee: 'Alex Morgan' }),
        'Archived',
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
});
