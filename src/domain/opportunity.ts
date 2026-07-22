export const OPPORTUNITY_STATUSES = [
  'New',
  'Assigned',
  'Development',
  'Implemented',
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
  Development: ['Implemented', 'Canceled', 'Rejected'],
  Implemented: ['Archived'],
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
  return opportunity.assignee === 'Alex Morgan';
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

const PRIORITY_RANK: Record<Priority, number> = { High: 0, Medium: 1, Low: 2 };

export function compareByDefaultOrder(a: Opportunity, b: Opportunity): number {
  return (
    PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() ||
    a.sequence - b.sequence
  );
}
