import {
  ASSIGNEES,
  OPPORTUNITY_STATUSES,
  type Opportunity,
  type OpportunityStatus,
  type Role,
} from '../domain/opportunity';

export const SCHEMA_VERSION = 1;

export interface AuditEvent {
  id: string;
  action:
    | 'login'
    | 'logout'
    | 'role_switch'
    | 'sample_data_loaded'
    | 'storage_reset'
    | 'recovery_used';
  actor: string;
  createdAt: string;
  fromRole?: Role;
  toRole?: Role;
}

export interface AppState {
  schemaVersion: typeof SCHEMA_VERSION;
  opportunities: Opportunity[];
  auditEvents: AuditEvent[];
  nextOpportunitySequence: number;
  customOrder: Partial<Record<OpportunityStatus, string[]>>;
  preferences: {
    welcomeDismissed: boolean;
    managerAssigneeFilter: string;
    employeeMyWork: boolean;
  };
}

export function createInitialState(): AppState {
  return {
    schemaVersion: SCHEMA_VERSION,
    opportunities: [],
    auditEvents: [],
    nextOpportunitySequence: 1,
    customOrder: {},
    preferences: {
      welcomeDismissed: false,
      managerAssigneeFilter: 'All Employees',
      employeeMyWork: true,
    },
  };
}

export function isAppState(value: unknown): value is AppState {
  if (!value || typeof value !== 'object') return false;
  const state = value as Partial<AppState>;
  return (
    state.schemaVersion === SCHEMA_VERSION &&
    Array.isArray(state.opportunities) &&
    state.opportunities.every(isOpportunity) &&
    Array.isArray(state.auditEvents) &&
    Number.isSafeInteger(state.nextOpportunitySequence) &&
    (state.nextOpportunitySequence ?? 0) > 0 &&
    !!state.customOrder &&
    typeof state.customOrder === 'object' &&
    !!state.preferences &&
    typeof state.preferences.welcomeDismissed === 'boolean'
  );
}

function isOpportunity(value: unknown): value is Opportunity {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<Opportunity>;
  return (
    typeof item.id === 'string' &&
    Number.isSafeInteger(item.sequence) &&
    (item.sequence ?? 0) > 0 &&
    typeof item.title === 'string' &&
    typeof item.description === 'string' &&
    typeof item.submitterName === 'string' &&
    ['High', 'Medium', 'Low'].includes(item.priority ?? '') &&
    OPPORTUNITY_STATUSES.includes(item.status as OpportunityStatus) &&
    (item.assignee === null ||
      ASSIGNEES.includes(item.assignee as (typeof ASSIGNEES)[number])) &&
    typeof item.createdAt === 'string' &&
    typeof item.updatedAt === 'string' &&
    Array.isArray(item.notes) &&
    Array.isArray(item.history)
  );
}
