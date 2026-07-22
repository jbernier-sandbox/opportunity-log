import AssignmentTurnedInOutlinedIcon from '@mui/icons-material/AssignmentTurnedInOutlined';
import CloseIcon from '@mui/icons-material/Close';
import HelpOutlineIcon from '@mui/icons-material/HelpOutlineOutlined';
import {
  Alert,
  AppBar,
  Box,
  Button,
  ButtonGroup,
  Container,
  CssBaseline,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  IconButton,
  Snackbar,
  Stack,
  TextField,
  ThemeProvider,
  Toolbar,
  Typography,
  createTheme,
} from '@mui/material';
import { type FormEvent, useEffect, useState } from 'react';

import type { Role } from './domain/opportunity';
import { type AppState, createInitialState } from './persistence/appState';
import { loadState, saveState } from './persistence/storage';
import {
  SESSION_KEY,
  authenticate,
  createAuditEvent,
  loadSession,
  type SessionState,
} from './session/session';

const theme = createTheme({
  palette: {
    primary: { main: '#0b6073', dark: '#123b4a', contrastText: '#fff' },
    secondary: { main: '#b45309' },
    background: { default: '#eef3f4', paper: '#fff' },
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily:
      'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    h1: { fontSize: 'clamp(1.9rem, 4vw, 3rem)', fontWeight: 800 },
    button: { fontWeight: 700, textTransform: 'none' },
  },
  components: {
    MuiButton: { styleOverrides: { root: { minHeight: 44 } } },
    MuiIconButton: {
      styleOverrides: { root: { minWidth: 44, minHeight: 44 } },
    },
  },
});

function getInitialData(): AppState {
  if (typeof window === 'undefined') return createInitialState();
  return loadState(window.localStorage).state;
}

function getInitialSession(): SessionState {
  if (typeof window === 'undefined')
    return { authenticated: false, role: 'Employee' };
  return loadSession(window.localStorage);
}

export function App() {
  const [data, setData] = useState(getInitialData);
  const [session, setSession] = useState(getInitialSession);
  const [view, setView] = useState<'Active' | 'Closed'>('Active');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [roleDialog, setRoleDialog] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    if (session.authenticated)
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  }, [session]);

  function persist(next: AppState) {
    setData(next);
    saveState(localStorage, next);
  }

  function addAudit(action: 'login' | 'logout' | 'role_switch', roles = {}) {
    const next = {
      ...data,
      auditEvents: [
        ...data.auditEvents,
        createAuditEvent(action, 'Alex Morgan', roles),
      ],
    };
    persist(next);
  }

  function signIn(event: FormEvent) {
    event.preventDefault();
    if (!authenticate(username, password)) {
      setLoginError(
        'Username or password is incorrect. Try demo / opportunity.',
      );
      return;
    }
    setLoginError('');
    setSession({ authenticated: true, role: 'Employee' });
    setView('Active');
    addAudit('login');
  }

  function confirmRoleSwitch() {
    const toRole: Role = session.role === 'Employee' ? 'Manager' : 'Employee';
    addAudit('role_switch', { fromRole: session.role, toRole });
    setSession({ authenticated: true, role: toRole });
    setRoleDialog(false);
    setFeedback(`${toRole} mode enabled.`);
  }

  function logout() {
    addAudit('logout');
    setSession({ authenticated: false, role: 'Employee' });
    setView('Active');
    setUsername('');
    setPassword('');
  }

  function dismissWelcome() {
    persist({
      ...data,
      preferences: { ...data.preferences, welcomeDismissed: true },
    });
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {session.authenticated ? (
        <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
          <AppBar position="static" elevation={0}>
            <Toolbar
              sx={{ gap: 1.5, minHeight: { xs: 72, md: 80 }, flexWrap: 'wrap' }}
            >
              <AssignmentTurnedInOutlinedIcon aria-hidden="true" />
              <Typography
                component="span"
                variant="h6"
                sx={{ fontWeight: 800, mr: { md: 2 } }}
              >
                Opportunity Log
              </Typography>
              <ButtonGroup
                aria-label="Opportunity view"
                size="small"
                sx={{ bgcolor: 'white' }}
              >
                <Button
                  aria-pressed={view === 'Active'}
                  onClick={() => setView('Active')}
                >
                  Active opportunities
                </Button>
                <Button
                  aria-pressed={view === 'Closed'}
                  onClick={() => setView('Closed')}
                >
                  Closed opportunities
                </Button>
              </ButtonGroup>
              <Box sx={{ flexGrow: 1 }} />
              <Stack spacing={0} sx={{ textAlign: 'right' }}>
                <Typography variant="body2" sx={{ fontWeight: 800 }}>
                  Alex Morgan
                </Typography>
                <Typography variant="caption">{session.role}</Typography>
              </Stack>
              <Button
                color="inherit"
                variant="outlined"
                onClick={() => setRoleDialog(true)}
              >
                Switch to {session.role === 'Employee' ? 'Manager' : 'Employee'}
              </Button>
              <IconButton
                color="inherit"
                aria-label="Help"
                onClick={() => setHelpOpen(true)}
              >
                <HelpOutlineIcon />
              </IconButton>
              <Button color="inherit" onClick={logout}>
                Log out
              </Button>
            </Toolbar>
          </AppBar>
          <Container component="main" maxWidth="xl" sx={{ py: 5 }}>
            <Typography component="h1" variant="h1" color="primary.dark">
              {view} opportunities
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 1.5 }}>
              The opportunity board arrives in Phase 3. Your current view and
              role controls are ready.
            </Typography>
          </Container>

          <Dialog
            open={!data.preferences.welcomeDismissed}
            aria-labelledby="welcome-title"
          >
            <DialogTitle id="welcome-title">
              Welcome to Opportunity Log
            </DialogTitle>
            <DialogContent>
              <Stack spacing={2}>
                <Typography>
                  Track improvement ideas from submission through completion.
                </Typography>
                <Typography>
                  Start in Employee mode as Alex Morgan. Switch roles to
                  evaluate manager workflows.
                </Typography>
                <Typography>
                  Managers can load sample data in a later phase. Help is always
                  available in the header.
                </Typography>
                <Alert severity="info">
                  This public prototype stores data in this browser. Do not
                  enter sensitive information.
                </Alert>
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button variant="contained" onClick={dismissWelcome}>
                Get started
              </Button>
            </DialogActions>
          </Dialog>

          <Dialog
            open={roleDialog}
            onClose={() => setRoleDialog(false)}
            aria-labelledby="role-title"
          >
            <DialogTitle id="role-title">Switch role?</DialogTitle>
            <DialogContent>
              <Typography>
                Switch from {session.role} to{' '}
                {session.role === 'Employee' ? 'Manager' : 'Employee'} mode?
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setRoleDialog(false)}>Cancel</Button>
              <Button variant="contained" onClick={confirmRoleSwitch}>
                Confirm switch
              </Button>
            </DialogActions>
          </Dialog>

          <Drawer
            anchor="right"
            open={helpOpen}
            onClose={() => setHelpOpen(false)}
          >
            <Box
              role="dialog"
              aria-labelledby="help-title"
              sx={{ width: { xs: '90vw', sm: 520 }, p: 3 }}
            >
              <Stack direction="row" sx={{ alignItems: 'center' }}>
                <Typography
                  id="help-title"
                  component="h2"
                  variant="h5"
                  sx={{ fontWeight: 800, flexGrow: 1 }}
                >
                  Help
                </Typography>
                <IconButton
                  aria-label="Close Help"
                  onClick={() => setHelpOpen(false)}
                >
                  <CloseIcon />
                </IconButton>
              </Stack>
              <Divider sx={{ my: 2 }} />
              <Stack spacing={2}>
                <Typography component="h3" variant="h6">
                  Sign in
                </Typography>
                <Typography>
                  Use username <strong>demo</strong> and password{' '}
                  <strong>opportunity</strong>.
                </Typography>
                <Typography component="h3" variant="h6">
                  Roles
                </Typography>
                <Typography>
                  Employees work as Alex Morgan. Manager mode provides
                  administrative controls. Role switching is a simulation, not
                  security.
                </Typography>
                <Typography component="h3" variant="h6">
                  Workflow
                </Typography>
                <Typography>
                  Opportunities move through Active stages before reaching
                  Closed outcomes. Detailed board guidance will appear with
                  those features.
                </Typography>
              </Stack>
            </Box>
          </Drawer>
          <Snackbar
            open={Boolean(feedback)}
            autoHideDuration={3000}
            onClose={() => setFeedback('')}
            message={feedback}
          />
        </Box>
      ) : (
        <Container
          component="main"
          maxWidth="sm"
          sx={{ py: { xs: 6, md: 12 } }}
        >
          <Stack spacing={4}>
            <Box>
              <Typography
                color="secondary.main"
                sx={{ fontWeight: 800, letterSpacing: '.08em' }}
              >
                CONTINUOUS IMPROVEMENT
              </Typography>
              <Typography
                component="h1"
                variant="h1"
                color="primary.dark"
                sx={{ mt: 1 }}
              >
                Welcome back
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 1 }}>
                Sign in to Opportunity Log.
              </Typography>
            </Box>
            <Box component="form" onSubmit={signIn} noValidate>
              <Stack spacing={2.5}>
                {loginError && (
                  <Alert severity="error" role="alert">
                    {loginError}
                  </Alert>
                )}
                <TextField
                  label="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                />
                <TextField
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <Button type="submit" variant="contained" size="large">
                  Sign in
                </Button>
                <Alert severity="info">
                  Demo credentials: demo / opportunity. This login provides no
                  real security.
                </Alert>
              </Stack>
            </Box>
          </Stack>
        </Container>
      )}
    </ThemeProvider>
  );
}
