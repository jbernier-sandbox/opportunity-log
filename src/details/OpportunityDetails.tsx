import CloseIcon from '@mui/icons-material/Close';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  IconButton,
} from '@mui/material';
import { type FormEvent, useState } from 'react';

import {
  addOpportunityNote,
  assignOpportunity,
  ASSIGNEES,
  availableTransitions,
  canAddNote,
  canEditCoreDetails,
  editOpportunity,
  requiresTransitionReason,
  transitionOpportunity,
  type Assignee,
  type Opportunity,
  type OpportunityActionContext,
  type OpportunityStatus,
  type Role,
} from '../domain/opportunity';

interface Props {
  opportunity: Opportunity | null;
  role: Role;
  onClose: () => void;
  onUpdate: (opportunity: Opportunity, message: string) => void;
}

function actionContext(role: Role): OpportunityActionContext {
  return {
    role,
    actor: role === 'Employee' ? 'Alex Morgan' : 'Jamie Chen',
    now: new Date().toISOString(),
    entryId: crypto.randomUUID(),
  };
}

export function OpportunityDetails({
  opportunity,
  role,
  onClose,
  onUpdate,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(opportunity?.title ?? '');
  const [description, setDescription] = useState(
    opportunity?.description ?? '',
  );
  const [priority, setPriority] = useState<Opportunity['priority']>(
    opportunity?.priority ?? 'Medium',
  );
  const [note, setNote] = useState('');
  const [transition, setTransition] = useState<OpportunityStatus | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!opportunity) return null;
  const transitions = availableTransitions(opportunity, role);
  const canEdit = canEditCoreDetails(opportunity, role);
  const canNote = canAddNote(opportunity, role);
  const workflowLocked = !opportunity.assignee && opportunity.status !== 'New';

  function apply(action: () => Opportunity, message: string) {
    try {
      setError('');
      onUpdate(action(), message);
      setSuccess(message);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'The action could not be completed.',
      );
    }
  }

  function saveEdit(event: FormEvent) {
    event.preventDefault();
    apply(
      () =>
        editOpportunity(
          opportunity!,
          { title, description, priority },
          actionContext(role),
        ),
      'Opportunity details updated.',
    );
    setEditing(false);
  }

  function changeAssignment(value: string) {
    const assignee = value === '' ? null : (value as Assignee);
    apply(
      () => assignOpportunity(opportunity!, assignee, actionContext(role)),
      assignee
        ? `Assigned to ${assignee}.`
        : 'Assignment cleared. Workflow is locked until reassigned.',
    );
  }

  function addNote(event: FormEvent) {
    event.preventDefault();
    apply(
      () => addOpportunityNote(opportunity!, note, actionContext(role)),
      'Note added.',
    );
    if (note.trim()) setNote('');
  }

  function confirmTransition() {
    if (!transition) return;
    apply(
      () =>
        transitionOpportunity(
          opportunity!,
          transition,
          reason,
          actionContext(role),
        ),
      `Status changed to ${transition}.`,
    );
    if (!requiresTransitionReason(transition) || reason.trim()) {
      setTransition(null);
      setReason('');
    }
  }

  return (
    <>
      <Drawer
        anchor="right"
        open
        onClose={onClose}
        slotProps={{ paper: { 'aria-labelledby': 'details-title' } }}
      >
        <Box sx={{ width: { xs: '94vw', md: 680 }, p: 3 }}>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="overline">{opportunity.id}</Typography>
              <Typography
                id="details-title"
                component="h2"
                variant="h5"
                sx={{ fontWeight: 800 }}
              >
                Opportunity details
              </Typography>
            </Box>
            <IconButton
              aria-label="Close opportunity details"
              onClick={onClose}
            >
              <CloseIcon />
            </IconButton>
          </Stack>
          <Divider sx={{ my: 2 }} />
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
            </Alert>
          )}
          {workflowLocked && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Workflow locked: assign an owner before changing status.
            </Alert>
          )}

          {editing ? (
            <Box component="form" onSubmit={saveEdit}>
              <Stack spacing={2}>
                <TextField
                  label="Title"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  slotProps={{ htmlInput: { maxLength: 120 } }}
                />
                <TextField
                  label="Description"
                  required
                  multiline
                  minRows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  slotProps={{ htmlInput: { maxLength: 2000 } }}
                />
                <FormControl>
                  <InputLabel id="edit-priority-label">Priority</InputLabel>
                  <Select
                    labelId="edit-priority-label"
                    label="Priority"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                  >
                    {['High', 'Medium', 'Low'].map((value) => (
                      <MenuItem key={value} value={value}>
                        {value}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Stack direction="row" spacing={1}>
                  <Button type="submit" variant="contained">
                    Save details
                  </Button>
                  <Button onClick={() => setEditing(false)}>Cancel edit</Button>
                </Stack>
              </Stack>
            </Box>
          ) : (
            <Stack spacing={1}>
              <Typography component="h3" variant="h6">
                {opportunity.title}
              </Typography>
              <Typography>{opportunity.description}</Typography>
              <Typography>
                <strong>Priority:</strong> {opportunity.priority}
              </Typography>
              <Typography>
                <strong>Status:</strong> {opportunity.status}
              </Typography>
              <Typography>
                <strong>Submitted by:</strong> {opportunity.submitterName}
              </Typography>
              {canEdit && (
                <Button
                  sx={{ alignSelf: 'flex-start' }}
                  onClick={() => setEditing(true)}
                >
                  Edit details
                </Button>
              )}
            </Stack>
          )}

          <Divider sx={{ my: 3 }} />
          <Typography component="h3" variant="h6" sx={{ mb: 1 }}>
            Assignment
          </Typography>
          {role === 'Manager' ? (
            <FormControl fullWidth>
              <InputLabel id="assignee-label">Assignee</InputLabel>
              <Select
                labelId="assignee-label"
                label="Assignee"
                value={opportunity.assignee ?? ''}
                onChange={(e) => changeAssignment(e.target.value)}
              >
                <MenuItem value="">
                  <em>Unassigned</em>
                </MenuItem>
                {ASSIGNEES.map((person) => (
                  <MenuItem key={person} value={person}>
                    {person}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : opportunity.status === 'New' && !opportunity.assignee ? (
            <Button
              variant="outlined"
              onClick={() => changeAssignment('Alex Morgan')}
            >
              Assign to me
            </Button>
          ) : (
            <Typography>{opportunity.assignee ?? 'Unassigned'}</Typography>
          )}

          <Divider sx={{ my: 3 }} />
          <Typography component="h3" variant="h6">
            Workflow actions
          </Typography>
          {transitions.length ? (
            <Stack
              direction="row"
              useFlexGap
              spacing={1}
              sx={{ mt: 1, flexWrap: 'wrap' }}
            >
              {transitions.map((target) => (
                <Button
                  key={target}
                  variant="outlined"
                  color={requiresTransitionReason(target) ? 'error' : 'primary'}
                  onClick={() => setTransition(target)}
                >
                  Move to {target}
                </Button>
              ))}
            </Stack>
          ) : (
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              No workflow actions are available.
            </Typography>
          )}

          <Divider sx={{ my: 3 }} />
          <Typography component="h3" variant="h6">
            Notes
          </Typography>
          {opportunity.notes.length === 0 ? (
            <Typography color="text.secondary">No notes yet.</Typography>
          ) : (
            <Stack component="ul" spacing={1} sx={{ pl: 2 }}>
              {opportunity.notes.map((item) => (
                <Box component="li" key={item.id}>
                  <Typography>{item.body}</Typography>
                  <Typography variant="caption">
                    {item.author} · {item.role}
                  </Typography>
                </Box>
              ))}
            </Stack>
          )}
          {canNote && (
            <Box component="form" onSubmit={addNote} sx={{ mt: 2 }}>
              <Stack spacing={1}>
                <TextField
                  label="Add note"
                  multiline
                  minRows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
                <Button
                  type="submit"
                  variant="contained"
                  sx={{ alignSelf: 'flex-start' }}
                >
                  Add note
                </Button>
              </Stack>
            </Box>
          )}

          <Divider sx={{ my: 3 }} />
          <Typography component="h3" variant="h6">
            Activity
          </Typography>
          {opportunity.history.length === 0 ? (
            <Typography color="text.secondary">No activity yet.</Typography>
          ) : (
            <Stack component="ol" spacing={1} sx={{ pl: 2 }}>
              {[...opportunity.history].reverse().map((item) => (
                <Box component="li" key={item.id}>
                  <Typography>{item.action.replace('_', ' ')}</Typography>
                  {item.changes?.map((change) => (
                    <Typography variant="body2" key={change.field}>
                      {change.field}: {change.previousValue ?? 'None'} →{' '}
                      {change.newValue ?? 'None'}
                    </Typography>
                  ))}
                  {item.reason && (
                    <Typography variant="body2">
                      Reason: {item.reason}
                    </Typography>
                  )}
                  <Typography variant="caption">
                    {item.actor} · {item.role}
                  </Typography>
                </Box>
              ))}
            </Stack>
          )}
        </Box>
      </Drawer>

      <Dialog
        open={Boolean(transition)}
        onClose={() => setTransition(null)}
        aria-labelledby="transition-title"
      >
        <DialogTitle id="transition-title">
          Change status to {transition}?
        </DialogTitle>
        <DialogContent>
          {transition && requiresTransitionReason(transition) && (
            <TextField
              autoFocus
              required
              fullWidth
              label="Reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              sx={{ mt: 1 }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTransition(null)}>Back</Button>
          <Button variant="contained" onClick={confirmTransition}>
            Confirm status change
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
