import AddIcon from '@mui/icons-material/Add';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { type FormEvent, useMemo, useState } from 'react';

import {
  compareByDefaultOrder,
  createOpportunity,
  availableTransitions,
  OPPORTUNITY_STATUSES,
  type NewOpportunityInput,
  type Opportunity,
  type OpportunityStatus,
  type Priority,
  type Role,
  type ValidationIssue,
  validateNewOpportunity,
  ASSIGNEES,
} from '../domain/opportunity';
import { orderOpportunities } from '../demo/demoOperations';

const CLOSED_STATUSES: ReadonlySet<OpportunityStatus> = new Set([
  'Complete',
  'Archived',
  'Canceled',
  'Rejected',
]);

interface Props {
  opportunities: Opportunity[];
  view: 'Active' | 'Closed';
  nextSequence: number;
  onCreate: (opportunity: Opportunity) => void;
  onFeedback: (message: string) => void;
  onSelect: (opportunity: Opportunity, opener: HTMLElement) => void;
  role: Role;
  customOrder: Partial<Record<OpportunityStatus, string[]>>;
  onMove: (opportunity: Opportunity, status: OpportunityStatus) => void;
  onReorderDrop: (
    status: OpportunityStatus,
    id: string,
    visibleIds: string[],
    targetId?: string,
  ) => void;
  managerAssigneeFilter: string;
  employeeMyWork: boolean;
  onManagerAssigneeFilterChange: (value: string) => void;
  onEmployeeMyWorkChange: (value: boolean) => void;
}

function DropColumn({
  status,
  disabled,
  children,
}: {
  status: OpportunityStatus;
  disabled: boolean;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status, disabled });
  return (
    <Box
      ref={setNodeRef}
      aria-disabled={disabled || undefined}
      sx={{
        bgcolor: isOver ? '#c6e3df' : '#dfe8ea',
        border: disabled ? '2px dashed #87979b' : '2px solid transparent',
        borderRadius: 2,
        p: 1,
        minHeight: 180,
      }}
    >
      {children}
    </Box>
  );
}

function DraggableCard({
  item,
  highlighted,
  onSelect,
}: {
  item: Opportunity;
  highlighted: boolean;
  onSelect: Props['onSelect'];
}) {
  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    transform,
    isDragging,
  } = useDraggable({ id: item.id });
  const { setNodeRef: setDropRef } = useDroppable({ id: `card:${item.id}` });
  const setNodeRef = (node: HTMLElement | null) => {
    setDragRef(node);
    setDropRef(node);
  };
  return (
    <Card
      ref={setNodeRef}
      variant="outlined"
      sx={{
        ...(highlighted ? { outline: '3px solid #b45309' } : {}),
        opacity: isDragging ? 0.55 : 1,
        transform: transform
          ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
          : undefined,
      }}
    >
      <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
          <Button
            aria-label={`Move ${item.id}`}
            size="small"
            variant="outlined"
            startIcon={<DragIndicatorIcon />}
            {...listeners}
            {...attributes}
            onClick={(event) => event.stopPropagation()}
            sx={{ minWidth: 70, minHeight: 44, touchAction: 'none', px: 0.5 }}
          >
            Move
          </Button>
        </Stack>
        <Box
          component="button"
          type="button"
          onClick={(event) => onSelect(item, event.currentTarget)}
          aria-label={`Open ${item.id}: ${item.title}`}
          sx={{
            width: '100%',
            textAlign: 'left',
            border: 0,
            bgcolor: 'transparent',
            cursor: 'pointer',
            p: 0,
          }}
        >
          <Stack
            direction="row"
            sx={{ justifyContent: 'space-between', gap: 1 }}
          >
            <Typography variant="caption" sx={{ fontWeight: 800 }}>
              {item.id}
            </Typography>
            <Chip
              label={item.priority}
              size="small"
              color={item.priority === 'High' ? 'error' : 'default'}
            />
          </Stack>
          <Typography
            component="h3"
            variant="body2"
            sx={{ mt: 0.5, fontWeight: 800 }}
          >
            {item.title}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mt: 0.5, display: 'block' }}
          >
            {item.description}
          </Typography>
          <Typography variant="caption" sx={{ mt: 0.5, display: 'block' }}>
            Submitted by {item.submitterName}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

const EMPTY_FORM: NewOpportunityInput = {
  title: '',
  description: '',
  submitterName: 'Alex Morgan',
  priority: 'Medium',
};

export function OpportunityBoard({
  opportunities,
  view,
  nextSequence,
  onCreate,
  onFeedback,
  onSelect,
  role,
  customOrder,
  onMove,
  onReorderDrop,
  managerAssigneeFilter,
  employeeMyWork,
  onManagerAssigneeFilterChange,
  onEmployeeMyWorkChange,
}: Props) {
  const [query, setQuery] = useState('');
  const [priority, setPriority] = useState<Priority | 'All'>('All');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<NewOpportunityInput>(EMPTY_FORM);
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [highlightedId, setHighlightedId] = useState('');
  const [assignToMe, setAssignToMe] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const statuses = OPPORTUNITY_STATUSES.filter((status) =>
    view === 'Closed'
      ? CLOSED_STATUSES.has(status)
      : !CLOSED_STATUSES.has(status),
  );
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return opportunities
      .filter((item) =>
        view === 'Closed'
          ? CLOSED_STATUSES.has(item.status)
          : !CLOSED_STATUSES.has(item.status),
      )
      .filter((item) => priority === 'All' || item.priority === priority)
      .filter((item) => {
        if (role === 'Employee')
          return !employeeMyWork || item.assignee === 'Alex Morgan';
        if (managerAssigneeFilter === 'All Employees') return true;
        if (managerAssigneeFilter === 'Unassigned')
          return item.assignee === null;
        return item.assignee === managerAssigneeFilter;
      })
      .filter(
        (item) =>
          !term ||
          [item.id, item.title, item.description, item.submitterName].some(
            (value) => value.toLowerCase().includes(term),
          ),
      )
      .sort(compareByDefaultOrder);
  }, [
    employeeMyWork,
    managerAssigneeFilter,
    opportunities,
    priority,
    query,
    role,
    view,
  ]);

  const dirty = JSON.stringify(form) !== JSON.stringify(EMPTY_FORM);

  function closeDialog() {
    if (dirty && !window.confirm('Discard this unsaved opportunity?')) return;
    setDialogOpen(false);
    setForm(EMPTY_FORM);
    setAssignToMe(false);
    setIssues([]);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const nextIssues = validateNewOpportunity(form);
    setIssues(nextIssues);
    if (nextIssues.length) return;
    const now = new Date().toISOString();
    const base = createOpportunity(form, nextSequence, now);
    const created: Opportunity = assignToMe
      ? { ...base, assignee: 'Alex Morgan', status: 'Assigned' }
      : base;
    onCreate(created);
    setHighlightedId(created.id);
    setDialogOpen(false);
    setForm(EMPTY_FORM);
    setAssignToMe(false);
    onFeedback(`${created.id} created successfully.`);
  }

  function errorFor(field: ValidationIssue['field']) {
    return issues.find((issue) => issue.field === field)?.message;
  }

  function finishDrag(event: DragEndEvent) {
    const opportunity = opportunities.find(
      (item) => item.id === event.active.id,
    );
    const overId = String(event.over?.id ?? '');
    const targetCardId = overId.startsWith('card:')
      ? overId.slice(5)
      : undefined;
    const targetCard = opportunities.find((item) => item.id === targetCardId);
    const status =
      targetCard?.status ??
      OPPORTUNITY_STATUSES.find((item) => item === overId);
    setDraggedId(null);
    if (!opportunity || !status) {
      if (opportunity) {
        setHighlightedId(opportunity.id);
        window.setTimeout(() => setHighlightedId(''), 2500);
        onFeedback(
          role === 'Employee'
            ? 'This card could not move because your Employee permissions or the workflow rule does not allow that destination.'
            : 'This card could not move because the workflow rule does not allow that destination.',
        );
      }
      return;
    }
    if (opportunity.status !== status) onMove(opportunity, status);
    else if (role === 'Manager') {
      const visibleIds = orderOpportunities(
        filtered.filter((item) => item.status === status),
        customOrder[status],
      ).map((item) => item.id);
      onReorderDrop(status, opportunity.id, visibleIds, targetCardId);
    } else {
      setHighlightedId(opportunity.id);
      window.setTimeout(() => setHighlightedId(''), 2500);
      onFeedback('Only managers may reorder cards within a column.');
    }
  }

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <TextField
          label="Search opportunities"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          sx={{ minWidth: { md: 320 } }}
        />
        <FormControl sx={{ minWidth: 180 }}>
          <InputLabel id="priority-filter-label">Priority</InputLabel>
          <Select
            labelId="priority-filter-label"
            label="Priority"
            value={priority}
            onChange={(event) => setPriority(event.target.value)}
          >
            {['All', 'High', 'Medium', 'Low'].map((value) => (
              <MenuItem key={value} value={value}>
                {value}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        {role === 'Manager' ? (
          <FormControl sx={{ minWidth: 190 }}>
            <InputLabel id="employee-filter-label">Employee</InputLabel>
            <Select
              labelId="employee-filter-label"
              label="Employee"
              value={managerAssigneeFilter}
              onChange={(event) =>
                onManagerAssigneeFilterChange(event.target.value)
              }
            >
              {['All Employees', ...ASSIGNEES, 'Unassigned'].map((value) => (
                <MenuItem key={value} value={value}>
                  {value}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        ) : (
          <Button
            variant={employeeMyWork ? 'contained' : 'outlined'}
            aria-pressed={employeeMyWork}
            onClick={() => {
              if (employeeMyWork) {
                setQuery('');
                setPriority('All');
              }
              onEmployeeMyWorkChange(!employeeMyWork);
            }}
          >
            {employeeMyWork ? 'Show All' : 'My Work'}
          </Button>
        )}
        <Box sx={{ flexGrow: 1 }} />
        {view === 'Active' && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setDialogOpen(true)}
          >
            New opportunity
          </Button>
        )}
      </Stack>

      {opportunities.length === 0 && (
        <Alert severity="info">
          No opportunities yet. Create the first opportunity to begin.
        </Alert>
      )}
      {opportunities.length > 0 && filtered.length === 0 && (
        <Alert severity="info">
          No opportunities match the current filters.
        </Alert>
      )}
      <DndContext
        sensors={sensors}
        accessibility={{
          screenReaderInstructions: {
            draggable:
              'To move an opportunity, press Space on its Move handle. Use the arrow keys to choose a permitted destination, press Space to drop, or Escape to cancel.',
          },
        }}
        onDragStart={(event) => setDraggedId(String(event.active.id))}
        onDragCancel={() => setDraggedId(null)}
        onDragEnd={finishDrag}
      >
        <Box
          aria-label={`${view} opportunity board`}
          sx={{
            display: 'grid',
            gridTemplateColumns: `repeat(${statuses.length}, minmax(180px, 1fr))`,
            gap: 1,
            minWidth: { xs: `${statuses.length * 188}px`, md: 0 },
          }}
        >
          {statuses.map((status) => {
            const items = orderOpportunities(
              filtered.filter((item) => item.status === status),
              customOrder[status],
            );
            const dragged = opportunities.find((item) => item.id === draggedId);
            const validTarget =
              !dragged ||
              dragged.status === status ||
              availableTransitions(dragged, role).includes(status);
            return (
              <DropColumn key={status} status={status} disabled={!validTarget}>
                <Stack
                  direction="row"
                  sx={{
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Typography
                    id={`column-${status}`}
                    component="h2"
                    variant="h6"
                  >
                    {status}
                  </Typography>
                  <Chip
                    label={items.length}
                    size="small"
                    aria-label={`${items.length} ${status} opportunities`}
                  />
                </Stack>
                <Stack spacing={1} sx={{ mt: 1 }}>
                  {items.length === 0 && (
                    <Typography color="text.secondary">
                      No opportunities
                    </Typography>
                  )}
                  {items.map((item) => (
                    <DraggableCard
                      key={item.id}
                      item={item}
                      highlighted={item.id === highlightedId}
                      onSelect={onSelect}
                    />
                  ))}
                </Stack>
              </DropColumn>
            );
          })}
        </Box>
      </DndContext>

      <Dialog
        open={dialogOpen}
        onClose={closeDialog}
        fullWidth
        maxWidth="sm"
        aria-labelledby="new-opportunity-title"
      >
        <Box component="form" onSubmit={submit} noValidate>
          <DialogTitle id="new-opportunity-title">New opportunity</DialogTitle>
          <DialogContent>
            <Stack spacing={2.5} sx={{ pt: 1 }}>
              <TextField
                label="Title"
                required
                value={form.title}
                onChange={(event) =>
                  setForm({ ...form, title: event.target.value })
                }
                error={Boolean(errorFor('title'))}
                helperText={errorFor('title')}
                slotProps={{ htmlInput: { maxLength: 120 } }}
              />
              <TextField
                label="Description"
                required
                multiline
                minRows={4}
                value={form.description}
                onChange={(event) =>
                  setForm({ ...form, description: event.target.value })
                }
                error={Boolean(errorFor('description'))}
                helperText={errorFor('description')}
                slotProps={{ htmlInput: { maxLength: 2000 } }}
              />
              <TextField
                label="Submitter name"
                required
                value={form.submitterName}
                onChange={(event) =>
                  setForm({ ...form, submitterName: event.target.value })
                }
                error={Boolean(errorFor('submitterName'))}
                helperText={errorFor('submitterName')}
                slotProps={{ htmlInput: { maxLength: 80 } }}
              />
              <FormControl>
                <InputLabel id="new-priority-label">Priority</InputLabel>
                <Select
                  labelId="new-priority-label"
                  label="Priority"
                  value={form.priority}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      priority: event.target.value,
                    })
                  }
                >
                  {['High', 'Medium', 'Low'].map((value) => (
                    <MenuItem key={value} value={value}>
                      {value}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={assignToMe}
                    onChange={(event) => setAssignToMe(event.target.checked)}
                  />
                }
                label="Assign to me"
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={closeDialog}>Cancel</Button>
            <Button type="submit" variant="contained">
              Create opportunity
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Stack>
  );
}
