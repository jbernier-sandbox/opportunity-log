import AddIcon from '@mui/icons-material/Add';
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
  OPPORTUNITY_STATUSES,
  type NewOpportunityInput,
  type Opportunity,
  type OpportunityStatus,
  type Priority,
  type ValidationIssue,
  validateNewOpportunity,
} from '../domain/opportunity';

const CLOSED_STATUSES: ReadonlySet<OpportunityStatus> = new Set([
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
}: Props) {
  const [query, setQuery] = useState('');
  const [priority, setPriority] = useState<Priority | 'All'>('All');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<NewOpportunityInput>(EMPTY_FORM);
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [highlightedId, setHighlightedId] = useState('');
  const [assignToMe, setAssignToMe] = useState(false);

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
      .filter(
        (item) =>
          !term ||
          [item.id, item.title, item.description, item.submitterName].some(
            (value) => value.toLowerCase().includes(term),
          ),
      )
      .sort(compareByDefaultOrder);
  }, [opportunities, priority, query, view]);

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

      {opportunities.length === 0 ? (
        <Alert severity="info">
          No opportunities yet. Create the first opportunity to begin.
        </Alert>
      ) : filtered.length === 0 ? (
        <Alert severity="info">
          No opportunities match the current filters.
        </Alert>
      ) : (
        <Box
          aria-label={`${view} opportunity board`}
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              lg: `repeat(${Math.min(statuses.length, 3)}, minmax(260px, 1fr))`,
            },
            gap: 2,
          }}
        >
          {statuses.map((status) => {
            const items = filtered.filter((item) => item.status === status);
            return (
              <Box
                component="section"
                aria-labelledby={`column-${status}`}
                key={status}
                sx={{
                  bgcolor: '#dfe8ea',
                  borderRadius: 2,
                  p: 2,
                  minHeight: 180,
                }}
              >
                <Stack
                  direction="row"
                  sx={{ justifyContent: 'space-between', alignItems: 'center' }}
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
                <Stack spacing={1.5} sx={{ mt: 2 }}>
                  {items.length === 0 && (
                    <Typography color="text.secondary">
                      No opportunities
                    </Typography>
                  )}
                  {items.map((item) => (
                    <Card
                      key={item.id}
                      variant="outlined"
                      sx={
                        item.id === highlightedId
                          ? { outline: '3px solid #b45309' }
                          : undefined
                      }
                    >
                      <CardContent>
                        <Stack
                          direction="row"
                          sx={{ justifyContent: 'space-between', gap: 1 }}
                        >
                          <Typography
                            variant="caption"
                            sx={{ fontWeight: 800 }}
                          >
                            {item.id}
                          </Typography>
                          <Chip
                            label={item.priority}
                            size="small"
                            color={
                              item.priority === 'High' ? 'error' : 'default'
                            }
                          />
                        </Stack>
                        <Typography
                          component="h3"
                          sx={{ mt: 1, fontWeight: 800 }}
                        >
                          {item.title}
                        </Typography>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ mt: 1 }}
                        >
                          {item.description}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ mt: 1.5, display: 'block' }}
                        >
                          Submitted by {item.submitterName}
                        </Typography>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              </Box>
            );
          })}
        </Box>
      )}

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
