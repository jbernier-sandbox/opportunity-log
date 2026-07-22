import type { Role } from '../domain/opportunity';
import type { AuditEvent } from '../persistence/appState';

export const SESSION_KEY = 'opportunity-log:session';

export interface SessionState {
  authenticated: boolean;
  role: Role;
}

export interface SessionStorageLike {
  getItem(key: string): string | null;
}

export interface ShellPreferences {
  view: 'Active' | 'Closed';
  filters: Record<string, string>;
}

export function authenticate(username: string, password: string): boolean {
  return username === 'demo' && password === 'opportunity';
}

export function loadSession(storage: SessionStorageLike): SessionState {
  try {
    const value = storage.getItem(SESSION_KEY);
    if (!value) return { authenticated: false, role: 'Employee' };
    const parsed: unknown = JSON.parse(value);
    if (
      parsed &&
      typeof parsed === 'object' &&
      (parsed as SessionState).authenticated === true &&
      ['Employee', 'Manager'].includes((parsed as SessionState).role)
    ) {
      return parsed as SessionState;
    }
  } catch {
    // A session is disposable; invalid data safely returns to login.
  }
  return { authenticated: false, role: 'Employee' };
}

export function createAuditEvent(
  action: AuditEvent['action'],
  actor: string,
  roles: Pick<AuditEvent, 'fromRole' | 'toRole'> = {},
): AuditEvent {
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
    action,
    actor,
    createdAt: new Date().toISOString(),
    ...roles,
  };
}

export function resetSessionPreferences(
  preferences: ShellPreferences,
): ShellPreferences {
  void preferences;
  return { view: 'Active', filters: {} };
}
