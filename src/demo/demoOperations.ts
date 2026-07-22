import {
  compareByDefaultOrder,
  createOpportunity,
  type Opportunity,
  type Role,
} from '../domain/opportunity';
import { createInitialState, type AppState } from '../persistence/appState';

const SAMPLES = [
  {
    key: 'guarding',
    title: 'Improve machine guarding',
    description: 'Add a transparent guard at the cutting station.',
    priority: 'High' as const,
    assignee: 'Alex Morgan' as const,
    status: 'Assigned' as const,
  },
  {
    key: 'labels',
    title: 'Standardize material labels',
    description: 'Use larger colour-coded labels in receiving.',
    priority: 'Medium' as const,
    assignee: 'Jamie Chen' as const,
    status: 'Development' as const,
  },
  {
    key: 'lighting',
    title: 'Improve inspection lighting',
    description: 'Add task lighting above the final inspection bench.',
    priority: 'Low' as const,
    assignee: null,
    status: 'New' as const,
  },
];

function requireManager(role: Role): void {
  if (role !== 'Manager')
    throw new Error('This action is available only to managers.');
}

export function loadSampleData(
  state: AppState,
  now: string,
  role: Role,
): AppState {
  requireManager(role);
  const existingKeys = new Set(
    state.opportunities.map((item) => item.sampleKey),
  );
  let sequence = state.nextOpportunitySequence;
  const additions = SAMPLES.filter(
    (sample) => !existingKeys.has(sample.key),
  ).map((sample) => {
    const base = createOpportunity(
      {
        title: sample.title,
        description: sample.description,
        submitterName: 'Demo data',
        priority: sample.priority,
      },
      sequence++,
      now,
    );
    return {
      ...base,
      sampleKey: sample.key,
      assignee: sample.assignee,
      status: sample.status,
    };
  });
  if (!additions.length) return state;
  return {
    ...state,
    opportunities: [...state.opportunities, ...additions],
    nextOpportunitySequence: sequence,
    auditEvents: [
      ...state.auditEvents,
      {
        id: crypto.randomUUID(),
        action: 'sample_data_loaded',
        actor: 'Manager',
        createdAt: now,
      },
    ],
  };
}

export function clearAllData(state: AppState, role: Role): AppState {
  requireManager(role);
  void state;
  return createInitialState();
}

export function canViewAudit(role: Role): boolean {
  return role === 'Manager';
}

export function moveInCustomOrder(
  ids: string[],
  id: string,
  offset: -1 | 1,
  role: Role,
): string[] {
  if (role !== 'Manager')
    throw new Error('Only managers may manually order cards.');
  const index = ids.indexOf(id);
  const target = index + offset;
  if (index < 0 || target < 0 || target >= ids.length) return ids;
  const result = [...ids];
  const current = result[index];
  const replacement = result[target];
  if (current === undefined || replacement === undefined) return ids;
  result[index] = replacement;
  result[target] = current;
  return result;
}

export function orderOpportunities(
  items: Opportunity[],
  order?: string[],
): Opportunity[] {
  if (!order?.length) return [...items].sort(compareByDefaultOrder);
  const ranks = new Map(order.map((id, index) => [id, index]));
  return [...items].sort((a, b) => {
    const aRank = ranks.get(a.id);
    const bRank = ranks.get(b.id);
    if (aRank !== undefined && bRank !== undefined) return aRank - bRank;
    if (aRank !== undefined) return -1;
    if (bRank !== undefined) return 1;
    return compareByDefaultOrder(a, b);
  });
}
