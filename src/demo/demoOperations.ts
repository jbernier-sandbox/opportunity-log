import {
  compareByDefaultOrder,
  createOpportunity,
  type Opportunity,
  type Role,
} from '../domain/opportunity';
import { createInitialState, type AppState } from '../persistence/appState';

const SAMPLES = [
  {
    key: 'tool-shadow-board',
    title: 'Add tool shadow board',
    description: 'Create a visual tool board beside the maintenance bench.',
    priority: 'Medium' as const,
    assignee: null,
    status: 'New' as const,
  },
  {
    key: 'guarding',
    title: 'Improve machine guarding',
    description: 'Add a transparent guard at the cutting station.',
    priority: 'High' as const,
    assignee: 'Alex Morgan' as const,
    status: 'Assigned' as const,
  },
  {
    key: 'changeover-checklist',
    title: 'Digitize changeover checklist',
    description: 'Pilot a tablet checklist for packaging-line changeovers.',
    priority: 'High' as const,
    assignee: 'Priya Patel' as const,
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
    key: 'parts-kitting',
    title: 'Improve parts kitting',
    description: 'Stage fasteners by work order before assembly begins.',
    priority: 'High' as const,
    assignee: 'Sam Rivera' as const,
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
  {
    key: 'inspection-template',
    title: 'Standardize inspection template',
    description: 'Test a single inspection form across both assembly cells.',
    priority: 'Medium' as const,
    assignee: 'Alex Morgan' as const,
    status: 'Pending Release' as const,
  },
  {
    key: 'downtime-codes',
    title: 'Clarify downtime codes',
    description: 'Validate simplified downtime reasons with operators.',
    priority: 'Low' as const,
    assignee: 'Jamie Chen' as const,
    status: 'Pending Release' as const,
  },
  {
    key: 'floor-markings',
    title: 'Refresh floor markings',
    description: 'Release updated aisle and staging-zone markings.',
    priority: 'High' as const,
    assignee: 'Sam Rivera' as const,
    status: 'Released' as const,
  },
  {
    key: 'torque-guides',
    title: 'Post torque guides',
    description: 'Deploy visual torque guides at final assembly stations.',
    priority: 'Medium' as const,
    assignee: 'Priya Patel' as const,
    status: 'Released' as const,
  },
  {
    key: 'recycling-stations',
    title: 'Add recycling stations',
    description: 'Install labelled recycling points near material prep.',
    priority: 'Low' as const,
    assignee: 'Alex Morgan' as const,
    status: 'Complete' as const,
  },
  {
    key: 'lift-assist',
    title: 'Install lift assist',
    description: 'Complete installation of the lift assist at packing.',
    priority: 'High' as const,
    assignee: 'Jamie Chen' as const,
    status: 'Complete' as const,
  },
  {
    key: 'paper-traveller',
    title: 'Replace paper traveller',
    description: 'Canceled after the ERP tablet workflow was approved.',
    priority: 'Medium' as const,
    assignee: 'Sam Rivera' as const,
    status: 'Canceled' as const,
  },
  {
    key: 'second-printer',
    title: 'Add a second label printer',
    description: 'Canceled after printer utilization was reviewed.',
    priority: 'Low' as const,
    assignee: 'Priya Patel' as const,
    status: 'Canceled' as const,
  },
  {
    key: 'manual-count-sheet',
    title: 'Add manual count sheet',
    description: 'Rejected because the scanner already captures the data.',
    priority: 'Low' as const,
    assignee: 'Alex Morgan' as const,
    status: 'Rejected' as const,
  },
  {
    key: 'extra-buffer-rack',
    title: 'Add extra buffer rack',
    description: 'Rejected after the revised material route removed the need.',
    priority: 'Medium' as const,
    assignee: 'Jamie Chen' as const,
    status: 'Rejected' as const,
  },
  {
    key: 'archived-5s-audit',
    title: 'Weekly 5S audit board',
    description: 'Archived after the audit process moved to tablets.',
    priority: 'Medium' as const,
    assignee: 'Priya Patel' as const,
    status: 'Archived' as const,
  },
  {
    key: 'archived-bin-labels',
    title: 'Legacy bin label refresh',
    description: 'Archived after all warehouse zones were relabelled.',
    priority: 'Low' as const,
    assignee: 'Sam Rivera' as const,
    status: 'Archived' as const,
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
        actor: 'Alex Morgan',
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
  visibleIds: string[] = ids,
): string[] {
  if (role !== 'Manager')
    throw new Error('Only managers may manually order cards.');
  const visibleIndex = visibleIds.indexOf(id);
  const visibleTarget = visibleIndex + offset;
  if (
    visibleIndex < 0 ||
    visibleTarget < 0 ||
    visibleTarget >= visibleIds.length
  )
    return ids;
  const index = ids.indexOf(id);
  const target = ids.indexOf(visibleIds[visibleTarget] ?? '');
  if (index < 0 || target < 0) return ids;
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
