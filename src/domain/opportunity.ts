export const OPPORTUNITY_STATUSES = [
  'New',
  'Assigned',
  'Development',
  'Pending Release',
  'Released',
  'Complete',
  'Canceled',
  'Rejected',
  'Archived',
] as const;

export type OpportunityStatus = (typeof OPPORTUNITY_STATUSES)[number];
export type Priority = 'High' | 'Medium' | 'Low';
export type Role = 'Employee' | 'Manager';

export const ASSIGNEES = [
  'Alex Morgan',
  'Jamie Chen',
  'Priya Patel',
  'Sam Rivera',
] as const;

export type Assignee = (typeof ASSIGNEES)[number];

export interface Note {
  id: string;
  body: string;
  author: string;
  role: Role;
  createdAt: string;
}

export interface HistoryEntry {
  id: string;
  action: 'created' | 'assigned' | 'status_changed' | 'edited';
  actor: string;
  role: Role;
  createdAt: string;
  changes?: ReadonlyArray<{
    field: string;
    previousValue: string | null;
    newValue: string | null;
  }>;
  reason?: string;
}

export interface OpportunityActionContext {
  role: Role;
  actor: Assignee;
  now: string;
  entryId: string;
}

export interface Opportunity {
  id: string;
  sequence: number;
  title: string;
  description: string;
  submitterName: string;
  priority: Priority;
  status: OpportunityStatus;
  assignee: Assignee | null;
  createdAt: string;
  updatedAt: string;
  notes: Note[];
  history: HistoryEntry[];
  sampleKey?: string;
}

export interface NewOpportunityInput {
  title: string;
  description: string;
  submitterName: string;
  priority?: Priority;
}

export interface ValidationIssue {
  field: 'title' | 'description' | 'submitterName';
  message: string;
}

const LIMITS = { title: 120, description: 2000, submitterName: 80 } as const;

export function formatOpportunityId(sequence: number): string {
  if (!Number.isSafeInteger(sequence) || sequence < 1) {
    throw new Error('Opportunity sequence must be a positive integer.');
  }
  return `OPP-${String(sequence).padStart(4, '0')}`;
}

export function validateNewOpportunity(
  input: NewOpportunityInput,
): ValidationIssue[] {
  return (Object.keys(LIMITS) as Array<keyof typeof LIMITS>).flatMap(
    (field) => {
      const value = input[field].trim();
      if (!value) return [{ field, message: 'This field is required.' }];
      if (value.length > LIMITS[field]) {
        return [
          {
            field,
            message: `Must be ${LIMITS[field]} characters or fewer.`,
          },
        ];
      }
      return [];
    },
  );
}

export function createOpportunity(
  input: NewOpportunityInput,
  sequence: number,
  now: string,
): Opportunity {
  const issues = validateNewOpportunity(input);
  if (issues.length > 0) throw new Error('Opportunity input is invalid.');

  return {
    id: formatOpportunityId(sequence),
    sequence,
    title: input.title.trim(),
    description: input.description.trim(),
    submitterName: input.submitterName.trim(),
    priority: input.priority ?? 'Medium',
    status: 'New',
    assignee: null,
    createdAt: now,
    updatedAt: now,
    notes: [],
    history: [],
  };
}

export const TERMINAL_STATUSES: ReadonlySet<OpportunityStatus> = new Set([
  'Canceled',
  'Rejected',
  'Archived',
]);

const TRANSITIONS: Record<OpportunityStatus, readonly OpportunityStatus[]> = {
  New: ['Assigned', 'Canceled', 'Rejected'],
  Assigned: ['Development', 'Canceled', 'Rejected'],
  Development: ['Pending Release', 'Canceled', 'Rejected'],
  'Pending Release': ['Released', 'Canceled', 'Rejected'],
  Released: ['Complete', 'Canceled', 'Rejected'],
  Complete: ['Canceled', 'Rejected', 'Archived'],
  Canceled: [],
  Rejected: [],
  Archived: [],
};

export function canTransition(
  opportunity: Opportunity,
  target: OpportunityStatus,
): boolean {
  if (!opportunity.assignee && opportunity.status !== 'New') return false;
  if (target === 'Assigned' && !opportunity.assignee) return false;
  return TRANSITIONS[opportunity.status].includes(target);
}

export function requiresTransitionReason(target: OpportunityStatus): boolean {
  return target === 'Canceled' || target === 'Rejected';
}

export function canEmployeeChangeStatus(opportunity: Opportunity): boolean {
  return (
    opportunity.assignee === 'Alex Morgan' &&
    !TERMINAL_STATUSES.has(opportunity.status)
  );
}

export function canAddNote(opportunity: Opportunity, role: Role): boolean {
  if (role === 'Manager') return true;
  return (
    opportunity.assignee === 'Alex Morgan' &&
    !TERMINAL_STATUSES.has(opportunity.status)
  );
}

export function canEditCoreDetails(
  opportunity: Opportunity,
  role: Role,
): boolean {
  return role === 'Manager' && !TERMINAL_STATUSES.has(opportunity.status);
}

export function availableTransitions(
  opportunity: Opportunity,
  role: Role,
): readonly OpportunityStatus[] {
  if (TERMINAL_STATUSES.has(opportunity.status)) return [];
  if (role === 'Employee' && !canEmployeeChangeStatus(opportunity)) return [];
  return TRANSITIONS[opportunity.status].filter((target) =>
    canTransition(opportunity, target),
  );
}

function historyEntry(
  context: OpportunityActionContext,
  entry: Omit<HistoryEntry, 'id' | 'actor' | 'role' | 'createdAt'>,
): HistoryEntry {
  return {
    ...entry,
    id: context.entryId,
    actor: context.actor,
    role: context.role,
    createdAt: context.now,
  };
}

function withHistory(
  opportunity: Opportunity,
  context: OpportunityActionContext,
  entry: Omit<HistoryEntry, 'id' | 'actor' | 'role' | 'createdAt'>,
  changes: Partial<Opportunity>,
): Opportunity {
  return {
    ...opportunity,
    ...changes,
    updatedAt: context.now,
    history: [...opportunity.history, historyEntry(context, entry)],
  };
}

export function editOpportunity(
  opportunity: Opportunity,
  updates: Pick<Opportunity, 'title' | 'description' | 'priority'>,
  context: OpportunityActionContext,
): Opportunity {
  if (!canEditCoreDetails(opportunity, context.role)) {
    throw new Error('Core details cannot be edited for this opportunity.');
  }
  const title = updates.title.trim();
  const description = updates.description.trim();
  if (!title || !description || title.length > 120 || description.length > 2000)
    throw new Error('Opportunity details are invalid.');
  const next = { title, description, priority: updates.priority };
  const changes = (Object.keys(next) as Array<keyof typeof next>)
    .filter((field) => opportunity[field] !== next[field])
    .map((field) => ({
      field,
      previousValue: opportunity[field],
      newValue: next[field],
    }));
  if (!changes.length) return opportunity;
  return withHistory(opportunity, context, { action: 'edited', changes }, next);
}

export function assignOpportunity(
  opportunity: Opportunity,
  assignee: Assignee | null,
  context: OpportunityActionContext,
): Opportunity {
  if (TERMINAL_STATUSES.has(opportunity.status))
    throw new Error('Terminal opportunities cannot be reassigned.');
  if (context.role === 'Employee') {
    if (
      context.actor !== 'Alex Morgan' ||
      opportunity.status !== 'New' ||
      opportunity.assignee !== null ||
      assignee !== 'Alex Morgan'
    )
      throw new Error(
        'Employees may only self-assign an unassigned New opportunity.',
      );
  }
  if (
    assignee === null &&
    ['Development', 'Pending Release', 'Released'].includes(opportunity.status)
  ) {
    throw new Error(
      `${opportunity.status} opportunities cannot be unassigned; choose another assignee.`,
    );
  }
  if (opportunity.assignee === assignee) return opportunity;
  const assigned = withHistory(
    opportunity,
    context,
    {
      action: 'assigned',
      changes: [
        {
          field: 'assignee',
          previousValue: opportunity.assignee,
          newValue: assignee,
        },
      ],
    },
    { assignee },
  );
  const derivedStatus =
    opportunity.status === 'New' && assignee
      ? 'Assigned'
      : opportunity.status === 'Assigned' && !assignee
        ? 'New'
        : null;
  if (!derivedStatus) return assigned;
  return withHistory(
    assigned,
    { ...context, entryId: `${context.entryId}-status` },
    {
      action: 'status_changed',
      changes: [
        {
          field: 'status',
          previousValue: opportunity.status,
          newValue: derivedStatus,
        },
      ],
    },
    { status: derivedStatus },
  );
}

export function addOpportunityNote(
  opportunity: Opportunity,
  body: string,
  context: OpportunityActionContext,
): Opportunity {
  if (!canAddNote(opportunity, context.role))
    throw new Error('You cannot add a note to this opportunity.');
  const trimmed = body.trim();
  if (!trimmed) throw new Error('A note is required.');
  return {
    ...opportunity,
    updatedAt: context.now,
    notes: [
      ...opportunity.notes,
      {
        id: context.entryId,
        body: trimmed,
        author: context.actor,
        role: context.role,
        createdAt: context.now,
      },
    ],
  };
}

export function transitionOpportunity(
  opportunity: Opportunity,
  target: OpportunityStatus,
  reason: string,
  context: OpportunityActionContext,
): Opportunity {
  if (!availableTransitions(opportunity, context.role).includes(target))
    throw new Error('This status transition is not permitted.');
  const trimmedReason = reason.trim();
  if (requiresTransitionReason(target) && !trimmedReason)
    throw new Error('A reason is required for this outcome.');
  return withHistory(
    opportunity,
    context,
    {
      action: 'status_changed',
      changes: [
        {
          field: 'status',
          previousValue: opportunity.status,
          newValue: target,
        },
      ],
      reason: trimmedReason || undefined,
    },
    { status: target },
  );
}

const PRIORITY_RANK: Record<Priority, number> = { High: 0, Medium: 1, Low: 2 };

export function compareByDefaultOrder(a: Opportunity, b: Opportunity): number {
  return (
    PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() ||
    a.sequence - b.sequence
  );
}
