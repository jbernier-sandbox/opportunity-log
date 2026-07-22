import {
  render,
  screen,
  waitFor,
  waitForElementToBeRemoved,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';

import { App } from './App';
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
});
