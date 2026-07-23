# Opportunity Log

[![CI](https://github.com/jbernier-sandbox/opportunity-log/actions/workflows/ci.yml/badge.svg)](https://github.com/jbernier-sandbox/opportunity-log/actions/workflows/ci.yml)

Opportunity Log is a touch-friendly, frontend-only continuous-improvement workflow prototype for submitting, reviewing, and progressing shop-floor opportunities.

**Live demo:** [opportunity-log-demo.netlify.app](https://opportunity-log-demo.netlify.app)

## Demo credentials

- Username: `demo`
- Password: `opportunity`

The credentials and Employee/Manager role switch are prototype simulations. They provide no authentication or authorization boundary. Do not enter sensitive or confidential information.

## Quick evaluator walkthrough

1. Sign in and dismiss the first-use welcome.
2. Create an opportunity. Select **Assign to me** to see employee ownership immediately.
3. Select the card body to open Details, add a note, and use an available status action.
4. Close Details, switch to Manager, and confirm the role change.
5. Load sample data, then search, filter, and reorder cards within a column.
6. Use a card's labelled **Move** handle with pointer, touch, or keyboard. Card selection and movement are deliberately separate.
7. Open Details to edit, assign, progress, or attempt a blocked transition. Cancel and Reject require a reason.
8. Review the opportunity's Notes and Activity, then open the manager-only application Audit log.
9. Optionally choose **Clear all data**. This restores first-launch state and removes opportunities, ordering, preferences, and the entire audit history.

The persistent Help panel repeats the essential interaction guidance without leaving the current board context.

## Features

- Active and Closed Kanban boards with counts, deterministic ordering, search, and priority filters
- Manager employee filtering plus a separately remembered Employee My Work/Show All filter
- Persistent header and filter controls for predictable tablet access
- Fullscreen mode for manufacturing-floor tablets, with Escape and header-toggle exit
- Employee submission and self-assignment as Alex Morgan
- Manager editing, assignment, reassignment, and workflow controls
- Pointer, touch, and keyboard drag-and-drop with a distinct 44px move handle
- Equivalent non-drag status controls in Opportunity Details
- Append-only notes, field-level activity history, and application audit events
- Additive, deduplicated sample data and a complete first-launch reset
- Versioned browser persistence, temporary-memory fallback, and corrupted-data recovery
- Accessible dialogs, drawers, focus restoration, live feedback, visible focus, and non-colour cues

## Workflow

The standard path is:

`New → Assigned → Development → Pending Release → Released → Complete → Archived`

The complete transition rules are:

| Current status               | Valid destinations                  |
| ---------------------------- | ----------------------------------- |
| New                          | Assigned, Canceled, Rejected        |
| Assigned                     | Development, Canceled, Rejected     |
| Development                  | Pending Release, Canceled, Rejected |
| Pending Release              | Released, Canceled, Rejected        |
| Released                     | Complete, Canceled, Rejected        |
| Complete                     | Archived, Canceled, Rejected        |
| Archived, Canceled, Rejected | None                                |

Canceled, Rejected, and Archived are terminal. Cancel and Reject require a reason. If a manager clears the assignee after an opportunity has left New, workflow progression is locked until the opportunity is assigned again.

## Roles and permissions

**Employee (Alex Morgan)** can create opportunities, optionally self-assign a new record, self-assign an unassigned New opportunity, add notes to non-terminal opportunities assigned to Alex, and use valid workflow actions for Alex's assigned work. Alex is also the sole Manager identity; switching modes changes permissions, not the actor.

**Manager** can edit non-terminal core details; assign, reassign, or clear assignment; use valid workflow actions; add notes to any opportunity; order cards; load sample data; review the application audit log; and clear all data. Available assignees are Alex Morgan, Jamie Chen, Priya Patel, and Sam Rivera.

Terminal opportunities cannot have their core details, assignment, or status changed. Managers may still append notes to them.

## Assumptions and usability decisions

The primary evaluation environment is a current Chrome or Edge browser on a 1920×1080 or 1024×600 landscape Windows device. The board uses large touch targets, horizontal scrolling, restrained high-contrast styling, readable timestamps, persistent Help, and visible text/icon cues rather than colour alone.

Selecting a card opens Details. Moving it requires the separate labelled handle, preventing tap-to-open and drag gestures from competing. The handle supports pointer and touch movement after an 8px activation threshold, plus Space, arrow keys, and Escape. Managers reorder within a column through drag-and-drop. Rejected drops explain the permission or workflow rule and highlight the blocked card. Details always provides an equivalent non-drag workflow.

The selected Active or Closed header button identifies the current board; separate board headings and the former authenticated subtitle are omitted to preserve vertical space. Header and filter controls remain visible without a collapse mode.

In Employee mode, the filter button describes its next action: **Show All** while Alex's My Work filter is active and **My Work** while all cards are visible. Show All also clears the Employee search and priority filters.

All five Active or four Closed columns remain visible when empty. The layout compacts cards and spacing to fit the supported 1024×600 landscape tablet width; narrower devices use horizontal scrolling as a fallback.

## Tech stack and rationale

- React, TypeScript, and Vite provide a compact, strictly typed SPA toolchain.
- Material UI supplies accessible, consistent interaction primitives.
- dnd-kit supports pointer, touch, and keyboard movement.
- `localStorage` provides browser-scoped persistence without a backend.
- Vitest, React Testing Library, jest-axe, and Playwright cover the test pyramid.
- GitHub Actions supplies reproducible quality gates; Netlify supplies Git-connected hosting and deploy previews.

## Run locally

Requirements: Node.js 24.14.0 (pinned in `.node-version` and `.nvmrc`) and npm 11 or later.

```bash
npm ci
npm run dev
```

Vite serves the application from the site root, so `base` remains `/`.

## Testing

```bash
npm run test             # Vitest domain and integration tests
npm run test:coverage    # tests plus V8 coverage report
npm run format           # Prettier verification
npm run lint             # ESLint with zero warnings
npm run typecheck        # strict TypeScript verification
npm run build            # production TypeScript and Vite build
npm run check            # format, lint, typecheck, tests, and build
npm run test:e2e         # Playwright critical journeys
```

Install Chromium once before the first local browser run:

```bash
npx playwright install chromium
```

Coverage output is written to `coverage/`; Playwright's report is written to `playwright-report/`. GitHub Actions runs the quality and E2E jobs for pull requests and pushes to `main`, and retains the Playwright report when the browser job runs.

### TDD workflow and CI evidence

Features are developed red–green–refactor: an approved requirement becomes a failing domain, integration, accessibility, or browser test; the minimum implementation makes it pass; then the code is refactored behind the retained regression test. Approved requirement changes are reflected in tests before behavior is changed.

The test pyramid consists of Vitest domain units, React Testing Library integration tests, jest-axe accessibility assertions, and Playwright evaluator journeys. To reproduce a CI failure, run the failing script above after `npm ci`; `npm run check`, `npm run test:coverage`, and `npm run test:e2e` reproduce the complete gate.

## Deployment

Netlify is connected to the public repository with:

- Production branch: `main`
- Build command: `npm ci && npm run build`
- Publish directory: `dist`
- Deploy previews: enabled for pull requests
- Node version: 24.14.0 from `netlify.toml`

The committed `netlify.toml` also applies security headers and rewrites `/*` to `/index.html` with status 200 for SPA navigation. No environment variables are required. If secrets are introduced later, configure them in the hosting environment rather than committing them.

Production publication is merge-gated: GitHub quality and Playwright checks must pass before an approved merge to `main`, after which Netlify deploys automatically. Deploy previews support review but do not replace CI or approval. The post-deployment workflow can run the critical Playwright journey against the public URL; a failed smoke check should be investigated and the previous successful Netlify deploy used as the rollback point when necessary.

## Data and reset behavior

The first launch is empty. **Load sample data** adds stable-keyed records without replacing user-created opportunities or duplicating earlier samples. **Clear all data** atomically removes opportunities, ordering, filters, preferences, and every audit event—including the clear action itself—then returns to the welcome experience.

Data is browser- and profile-scoped in `localStorage`; it is not shared between devices or users. If persistent storage is unavailable, the application announces temporary-memory mode. Corrupted or incompatible stored data presents a recovery action. Storage-capacity failures preserve the current in-memory session; clear application data or browser site data before retrying persistence.

## Project structure

```text
src/
  domain/       opportunity model, permissions, and transitions
  persistence/  versioned application state and browser storage
  session/      prototype login, roles, preferences, and audit events
  board/        Kanban rendering, filtering, drag-and-drop, and ordering
  details/      editing, assignment, notes, activity, and status actions
  demo/         sample loading, manual ordering, audit access, and reset
  test/         shared test and accessibility setup
e2e/            Playwright evaluator and recovery journeys
.github/        CI and post-deployment smoke workflows
```

## Limitations

- Fixed credentials and Manager mode are client-side demonstrations, not security controls.
- Data exists only in the current browser profile and is not multi-user or server-backed.
- There are no attachments, reporting, import/export, offline/PWA support, or notification centre.
- Application audit history is browser-local and is intentionally removed by Clear all.
- The prototype targets current Chrome and Edge on landscape Windows devices; broader browser/device certification is out of scope.

## Future enhancements

Real authentication and authorization, an API and database, multi-user collaboration, attachments, reporting and export, offline/PWA support, notifications, server-retained audit history, and a production security/privacy review would be required before operational use.

## AI-assisted development statement

AI assistance was used to help structure requirements, identify ambiguities, propose test cases, draft code, and execute validation. Human decisions remained authoritative: scope and requirement changes were explicitly approved, source documents were reconciled before implementation, tests were retained as regression evidence, CI gated merges, and the deployed result was reviewed between phases.

## Submission checklist

- [ ] Live demo loads at the public URL
- [ ] Public repository is accessible
- [ ] GitHub quality and Playwright checks are green
- [ ] Demo credentials are visible and work
- [ ] Evaluator walkthrough completes in a clean browser profile
- [ ] Persistence and one critical workflow pass against production
- [ ] Current Chrome and Edge smoke checks are recorded
- [ ] README, in-app Help, limitations, and security warning are accurate
