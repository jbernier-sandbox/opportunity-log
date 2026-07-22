import { createInitialState } from '../persistence/appState';
import {
  SESSION_KEY,
  authenticate,
  createAuditEvent,
  loadSession,
  resetSessionPreferences,
} from './session';

describe('prototype session rules', () => {
  it('accepts only the documented credentials', () => {
    expect(authenticate('demo', 'opportunity')).toBe(true);
    expect(authenticate('demo', 'wrong')).toBe(false);
    expect(authenticate('other', 'opportunity')).toBe(false);
  });

  it('retains a valid session and rejects malformed session data', () => {
    expect(
      loadSession({
        getItem: (key) =>
          key === SESSION_KEY
            ? JSON.stringify({ authenticated: true, role: 'Manager' })
            : null,
      }),
    ).toEqual({ authenticated: true, role: 'Manager' });
    expect(loadSession({ getItem: () => '{broken' })).toEqual({
      authenticated: false,
      role: 'Employee',
    });
  });

  it('creates complete audit records for authentication and role changes', () => {
    const event = createAuditEvent('role_switch', 'Alex Morgan', {
      fromRole: 'Employee',
      toRole: 'Manager',
    });
    expect(event).toMatchObject({
      action: 'role_switch',
      actor: 'Alex Morgan',
      fromRole: 'Employee',
      toRole: 'Manager',
    });
    expect(event.id).toBeTruthy();
    expect(new Date(event.createdAt).toString()).not.toBe('Invalid Date');
  });

  it('resets view and filters without disturbing durable app data', () => {
    const state = createInitialState();
    state.preferences.welcomeDismissed = true;
    expect(
      resetSessionPreferences({
        view: 'Closed',
        filters: { query: 'pump', priority: 'High' },
      }),
    ).toEqual({ view: 'Active', filters: {} });
    expect(state.preferences.welcomeDismissed).toBe(true);
  });
});
