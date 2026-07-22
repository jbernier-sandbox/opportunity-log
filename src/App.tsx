import AssignmentTurnedInOutlinedIcon from '@mui/icons-material/AssignmentTurnedInOutlined';
import {
  AppBar,
  Box,
  Button,
  Chip,
  Container,
  CssBaseline,
  Stack,
  ThemeProvider,
  Toolbar,
  Typography,
  createTheme,
} from '@mui/material';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#0b6073', dark: '#123b4a', contrastText: '#ffffff' },
    secondary: { main: '#d97706' },
    background: { default: '#f2f5f6', paper: '#ffffff' },
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily:
      'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    h1: { fontSize: 'clamp(2rem, 4vw, 3.25rem)', fontWeight: 750 },
    button: { fontWeight: 700, textTransform: 'none' },
  },
  components: {
    MuiButton: {
      styleOverrides: { root: { minHeight: 48, paddingInline: 20 } },
    },
  },
});

export function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        <AppBar position="static" elevation={0}>
          <Toolbar sx={{ minHeight: { xs: 64, md: 72 } }}>
            <AssignmentTurnedInOutlinedIcon
              aria-hidden="true"
              sx={{ mr: 1.5 }}
            />
            <Typography component="span" variant="h6" sx={{ fontWeight: 800 }}>
              Opportunity Log
            </Typography>
            <Chip
              label="Foundation"
              size="small"
              sx={{
                ml: 'auto',
                bgcolor: 'rgba(255,255,255,.14)',
                color: 'white',
              }}
            />
          </Toolbar>
        </AppBar>

        <Container
          component="main"
          maxWidth="lg"
          sx={{ py: { xs: 7, md: 12 } }}
        >
          <Stack spacing={4} sx={{ alignItems: 'flex-start', maxWidth: 760 }}>
            <Box>
              <Typography
                sx={{
                  color: 'secondary.main',
                  fontWeight: 800,
                  letterSpacing: '0.08em',
                }}
              >
                CONTINUOUS IMPROVEMENT
              </Typography>
              <Typography
                component="h1"
                variant="h1"
                sx={{ mt: 1.5, color: 'primary.dark' }}
              >
                Turn workplace ideas into visible progress.
              </Typography>
            </Box>
            <Typography
              variant="h5"
              component="p"
              sx={{ color: 'text.secondary', lineHeight: 1.55 }}
            >
              A touch-friendly workflow for submitting, assigning, and tracking
              improvement opportunities from the shop floor to completion.
            </Typography>
            <Button
              variant="contained"
              size="large"
              disabled
              aria-describedby="foundation-note"
            >
              Sign in to continue
            </Button>
            <Typography id="foundation-note" color="text.secondary">
              Project foundation is ready. Login and workflow features arrive in
              the next phases.
            </Typography>
          </Stack>
        </Container>
      </Box>
    </ThemeProvider>
  );
}
