import {
  render,
  screen,
  waitFor,
  waitForElementToBeRemoved,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';

import { App } from './App';
import { createOpportunity, type Opportunity } from './domain/opportunity';
import { createInitialState } from './persistence/appState';
import { STORAGE_KEY } from './persistence/storage';
import { SESSION_KEY } from './session/session';

describe('login and application shell', () => {
  beforeEach(() => localStorage.clear());

  async function login() {
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/username/i), 'demo');
    await user.type(screen.getByLabelText(/password/i), 'opportunity');
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    return user;
  }

  async function dismissWelcome(user: ReturnType<typeof userEvent.setup>) {
    const welcome = screen.getByRole('dialog', { name: /welcome/i });
    await user.click(screen.getByRole('button', { name: /get started/i }));
    await waitForElementToBeRemoved(welcome);
  }

  async function closeRoleDialog(
    user: ReturnType<typeof userEvent.setup>,
    action: 'cancel' | 'confirm',
  ) {
    const dialog = screen.getByRole('dialog', { name: /switch role/i });
    await user.click(
      screen.getByRole('button', {
        name: action === 'cancel' ? /cancel/i : /confirm switch/i,
      }),
    );
    await waitForElementToBeRemoved(dialog);
  }

  function seedOpportunity(overrides: Partial<Opportunity> = {}) {
    const item = {
      ...createOpportunity(
        {
          title: 'Safer lift',
          description: 'Add a lift table',
          submitterName: 'Alex Morgan',
        },
        1,
        '2026-07-22T15:00:00.000Z',
      ),
      ...overrides,
    };
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...createInitialState(),
        opportunities: [item],
        nextOpportunitySequence: 2,
        preferences: { welcomeDismissed: true },
      }),
    );
    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ authenticated: true, role: 'Employee' }),
    );
  }

  it('rejects invalid credentials and accepts the documented login', async () => {
    render(<App />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/username/i), 'demo');
    await user.type(screen.getByLabelText(/password/i), 'wrong');
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    expect(
      screen.getByText(/username or password is incorrect/i),
    ).toBeInTheDocument();

    await user.clear(screen.getByLabelText(/password/i));
    await user.type(screen.getByLabelText(/password/i), 'opportunity');
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    expect(
      screen.getByText('Alex Morgan', { exact: true }),
    ).toBeInTheDocument();
    expect(screen.getByText('Employee', { exact: true })).toBeInTheDocument();
    expect(localStorage.getItem(SESSION_KEY)).toContain('authenticated');
  });

  it('retains a session and shows the welcome only until dismissed', async () => {
    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ authenticated: true, role: 'Employee' }),
    );
    const { container } = render(<App />);
    expect(
      screen.getByRole('dialog', { name: /welcome/i }),
    ).toBeInTheDocument();
    await dismissWelcome(userEvent.setup());
    expect(localStorage.getItem(STORAGE_KEY)).toContain('welcomeDismissed');
    expect(await axe(container)).toHaveNoViolations();
  });

  it('requires confirmation in both directions and audits confirmed switches', async () => {
    render(<App />);
    const user = await login();
    await dismissWelcome(user);
    await user.click(
      screen.getByRole('button', { name: /switch to manager/i }),
    );
    expect(
      screen.getByRole('dialog', { name: /switch role/i }),
    ).toBeInTheDocument();
    await closeRoleDialog(user, 'cancel');
    expect(screen.getByText('Employee', { exact: true })).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: /switch to manager/i }),
    );
    await closeRoleDialog(user, 'confirm');
    expect(screen.getByText(/manager mode enabled/i)).toBeInTheDocument();
    expect(localStorage.getItem(STORAGE_KEY)).toContain('role_switch');

    await user.click(
      screen.getByRole('button', { name: /switch to employee/i }),
    );
    await closeRoleDialog(user, 'confirm');
    expect(screen.getByText('Employee', { exact: true })).toBeInTheDocument();
  });

  it('opens Help and restores focus when it closes', async () => {
    render(<App />);
    const user = await login();
    await dismissWelcome(user);
    const help = screen.getByRole('button', { name: /help/i });
    await user.click(help);
    expect(screen.getByRole('dialog', { name: /help/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /close help/i }));
    await waitFor(() => expect(help).toHaveFocus());
  });

  it('logs out and returns the next login to Employee and Active', async () => {
    render(<App />);
    const user = await login();
    await dismissWelcome(user);
    await user.click(
      screen.getByRole('button', { name: /closed opportunities/i }),
    );
    await user.click(
      screen.getByRole('button', { name: /switch to manager/i }),
    );
    await closeRoleDialog(user, 'confirm');
    await user.click(screen.getByRole('button', { name: /log out/i }));
    expect(
      screen.getByRole('heading', { name: /welcome back/i }),
    ).toBeInTheDocument();

    await login();
    expect(screen.getByText('Employee', { exact: true })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /active opportunities/i }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('has no detectable login accessibility violations', async () => {
    const { container } = render(<App />);

    expect(await axe(container)).toHaveNoViolations();
  });

  it('creates, persists, highlights, filters, and counts an opportunity', async () => {
    render(<App />);
    const user = await login();
    await dismissWelcome(user);

    expect(screen.getByText(/no opportunities yet/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /new opportunity/i }));
    await user.clear(screen.getByLabelText(/submitter name/i));
    await user.click(
      screen.getByRole('button', { name: /create opportunity/i }),
    );
    expect(screen.getAllByText(/this field is required/i)).toHaveLength(3);

    await user.type(screen.getByLabelText(/^title/i), 'Safer lift station');
    await user.type(
      screen.getByLabelText(/^description/i),
      'Add a lift table to reduce strain.',
    );
    await user.type(screen.getByLabelText(/submitter name/i), 'Alex Morgan');
    await user.click(screen.getByRole('checkbox', { name: /assign to me/i }));
    await user.click(
      screen.getByRole('button', { name: /create opportunity/i }),
    );

    expect(screen.getByText('OPP-0001')).toBeInTheDocument();
    expect(screen.getByText('Safer lift station')).toBeInTheDocument();
    expect(
      screen.getByLabelText(/1 assigned opportunities/i),
    ).toBeInTheDocument();
    expect(localStorage.getItem(STORAGE_KEY)).toContain('Safer lift station');
    expect(localStorage.getItem(STORAGE_KEY)).toContain('Alex Morgan');
    expect(localStorage.getItem(STORAGE_KEY)).toContain('Assigned');

    await user.type(screen.getByLabelText(/search opportunities/i), 'missing');
    expect(screen.getByText(/no opportunities match/i)).toBeInTheDocument();
  });

  it('protects a dirty submission from accidental discard', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<App />);
    const user = await login();
    await dismissWelcome(user);
    await user.click(screen.getByRole('button', { name: /new opportunity/i }));
    await user.type(screen.getByLabelText(/^title/i), 'Unsaved idea');
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(confirm).toHaveBeenCalledWith('Discard this unsaved opportunity?');
    expect(
      screen.getByRole('dialog', { name: /new opportunity/i }),
    ).toBeInTheDocument();
    confirm.mockRestore();
  });

  it('lets an employee self-assign, add a note, and advance assigned work', async () => {
    seedOpportunity();
    render(<App />);
    const user = userEvent.setup();
    const card = screen.getByRole('button', { name: /open OPP-0001/i });
    await user.click(card);
    expect(
      screen.getByRole('dialog', { name: /opportunity details/i }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /assign to me/i }));
    await user.type(
      screen.getByLabelText(/add note/i),
      'Checked the work area.',
    );
    await user.click(screen.getByRole('button', { name: /^add note$/i }));
    expect(screen.getByText('Checked the work area.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /move to assigned/i }));
    const assignedDialog = screen.getByRole('dialog', {
      name: /change status to assigned/i,
    });
    await user.click(
      screen.getByRole('button', { name: /confirm status change/i }),
    );
    await waitForElementToBeRemoved(assignedDialog);
    expect(screen.getByText(/status changed to assigned/i)).toBeInTheDocument();
    expect(localStorage.getItem(STORAGE_KEY)).toContain(
      'Checked the work area.',
    );
  });

  it('lets a manager edit, assign, clear assignment, and records activity', async () => {
    seedOpportunity({ assignee: 'Alex Morgan', status: 'Assigned' });
    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ authenticated: true, role: 'Manager' }),
    );
    render(<App />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /open OPP-0001/i }));
    await user.click(screen.getByRole('button', { name: /edit details/i }));
    await user.clear(screen.getByLabelText(/^title/i));
    await user.type(screen.getByLabelText(/^title/i), 'Safer lift station');
    await user.click(screen.getByRole('button', { name: /save details/i }));
    expect(
      screen.getByRole('heading', { name: 'Safer lift station' }),
    ).toBeInTheDocument();
    await user.click(screen.getByLabelText(/assignee/i));
    await user.click(screen.getByRole('option', { name: /unassigned/i }));
    expect(screen.getByText(/workflow locked/i)).toBeInTheDocument();
    expect(
      screen.getByText(/title: Safer lift → Safer lift station/i),
    ).toBeInTheDocument();
  });

  it('requires a reason for canceling and preserves focus after details close', async () => {
    seedOpportunity({ assignee: 'Alex Morgan' });
    render(<App />);
    const user = userEvent.setup();
    const card = screen.getByRole('button', { name: /open OPP-0001/i });
    await user.click(card);
    await user.click(screen.getByRole('button', { name: /move to canceled/i }));
    await user.click(
      screen.getByRole('button', { name: /confirm status change/i }),
    );
    expect(screen.getByText(/reason is required/i)).toBeInTheDocument();
    await user.type(screen.getByLabelText(/reason/i), 'Duplicate request');
    const canceledDialog = screen.getByRole('dialog', {
      name: /change status to canceled/i,
    });
    await user.click(
      screen.getByRole('button', { name: /confirm status change/i }),
    );
    await waitForElementToBeRemoved(canceledDialog);
    expect(screen.getAllByText(/status changed to canceled/i)).not.toHaveLength(
      0,
    );
    await user.click(
      screen.getByRole('button', { name: /close opportunity details/i }),
    );
    await waitFor(() =>
      expect(
        screen.getByRole('heading', { name: /active opportunities/i }),
      ).toHaveFocus(),
    );
  });

  it('has no detectable accessibility violations in opportunity details', async () => {
    seedOpportunity({ assignee: 'Alex Morgan', status: 'Assigned' });
    render(<App />);
    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: /open OPP-0001/i }));
    expect(await axe(document.body)).toHaveNoViolations();
  });
});
