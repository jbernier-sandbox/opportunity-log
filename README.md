# Opportunity Log

[![CI](https://github.com/jbernier-sandbox/opportunity-log/actions/workflows/ci.yml/badge.svg)](https://github.com/jbernier-sandbox/opportunity-log/actions/workflows/ci.yml)

Opportunity Log is a touch-friendly, frontend-only prototype for capturing, reviewing, assigning, and progressing continuous-improvement opportunities on a manufacturing floor.

> **Evaluation links**
>
> - **Live demo:** [opportunity-log-demo.netlify.app](https://opportunity-log-demo.netlify.app)
> - **Username:** `demo`
> - **Password:** `opportunity`

The credentials and Employee/Manager role switch are prototype simulations. They do not provide authentication or authorization. Do not enter sensitive or confidential information.

## What the prototype demonstrates

- Active and Closed Kanban boards with counts, deterministic ordering, search, and priority filters
- Employee submission and self-assignment, plus manager editing, assignment, reassignment, and workflow controls
- Pointer, touch, and keyboard drag-and-drop through a distinct, labelled 44 px move handle
- Equivalent non-drag workflow actions in Opportunity Details
- Manager employee filtering and a separately remembered Employee **My Work/Show All** filter
- Fullscreen tablet use with both header-toggle and Escape exit
- Append-only notes, field-level activity history, and application audit events
- Additive, deduplicated demo data with at least two cards in every active and terminal status
- Versioned browser persistence, temporary-memory fallback, corrupted-data recovery, and a complete first-launch reset
- Accessible dialogs, drawers, focus restoration, live feedback, visible focus, and non-colour cues

## Suggested evaluator walkthrough

1. Sign in with the demo credentials and dismiss the first-use welcome.
2. Create an opportunity. Select **Assign to me** to see ownership applied immediately and the status move automatically from New to Assigned.
3. Select the card body to open Details, add a note, and use an available status action.
4. Close Details, switch to Manager, and confirm the role change.
5. Select **Load sample data**, then search and filter the populated Active and Closed boards.
6. Reorder cards within a column by using a card's labelled **Move** handle with pointer, touch, or keyboard. Card selection and movement are deliberately separate.
7. Open Details to edit, assign, progress, or attempt a blocked transition. Cancel and Reject require a reason.
8. Move an Assigned opportunity back to New and confirm that the warning explains that its assignee will also be removed.
9. Review Notes and Activity, then open the manager-only application Audit log.
10. Optionally select **Clear all data**. This restores first-launch state and removes opportunities, ordering, preferences, and the entire audit history.

The persistent Help panel repeats the essential interaction guidance without taking the evaluator away from the board.

## Current product behavior

### Workflow

The primary path is:

`New ⇄ Assigned ⇄ Development ⇄ Pending Release → Released → Complete → Archived`

| Current status               | Valid destinations                            |
| ---------------------------- | --------------------------------------------- |
| New                          | Assigned, Canceled, Rejected                  |
| Assigned                     | New, Development, Canceled, Rejected          |
| Development                  | Assigned, Pending Release, Canceled, Rejected |
| Pending Release              | Development, Released, Canceled, Rejected     |
| Released                     | Complete, Canceled, Rejected                  |
| Complete                     | Archived, Canceled, Rejected                  |
| Archived, Canceled, Rejected | None                                          |

Canceled, Rejected, and Archived are terminal. Cancel and Reject require a reason. Returning Assigned work to New requires confirmation and atomically removes its assignee. Released work can move only to Complete, Canceled, or Rejected.

### Roles and permissions

**Employee (Alex Morgan)** can:

- create opportunities and optionally self-assign a new record;
- self-assign an existing, unassigned New opportunity;
- add notes to non-terminal opportunities assigned to Alex; and
- use valid workflow actions for work assigned to Alex.

**Manager** can:

- edit non-terminal core details;
- assign, reassign, or clear assignment where the workflow permits;
- use valid workflow actions;
- add notes to any opportunity;
- reorder cards within a column;
- load sample data;
- review the application Audit log; and
- clear all application data.

Alex Morgan is the sole signed-in identity and the sole manager. Switching modes changes permissions, not the actor. Jamie Chen, Priya Patel, and Sam Rivera are assignable employees, not additional signed-in users.

Terminal opportunities cannot have their core details, assignment, or status changed. Managers may still append notes to them.

### Assignment behavior

- Assigning an employee to a New opportunity atomically moves it to Assigned and records separate assignment and status Activity entries.
- Removing the assignee from an Assigned opportunity atomically returns it to New and records separate Activity entries.
- In Development, Pending Release, or Released, a manager may reassign an opportunity, but Unassigned is not available.
- Employee mode permits Alex to assign only an unassigned New opportunity to himself.

### Filtering and board layout

- Manager filtering includes **All Employees**, every named employee, and **Unassigned**.
- Employee filtering defaults to **My Work**. The control describes its next action: it displays **Show All** while My Work is active and **My Work** while all cards are visible.
- Selecting **Show All** also clears Employee search and priority filters.
- Employee and Manager filter selections are remembered independently.
- All five Active or all four Closed columns remain visible when empty or when filters have no matches.
- Filtered reordering moves only visible cards while preserving the positions of hidden cards.

## Assumptions and design rationale

These are the current assumptions that explain why the prototype behaves as it does. Superseded choices belong in the project Decision Log and are not presented here as current requirements.

### Business and workflow assumptions

- An opportunity follows one controlled lifecycle. Active work uses New, Assigned, Development, Pending Release, and Released; Closed work uses Complete, Archived, Canceled, and Rejected.
- Work may move backward from Pending Release to Development, from Development to Assigned, and from Assigned to New so teams can correct premature progression without recreating a card.
- Moving Assigned work to New means it is no longer owned. The action therefore requires confirmation and clears the assignee as part of the same state change.
- Released work has already reached the floor or customer-facing outcome, so it can move only to Complete or a terminal exception state.
- Cancel and Reject are materially different business outcomes and require a reason for traceability.
- Archived, Canceled, and Rejected records are immutable except for manager notes. This preserves their final business state while still allowing contextual follow-up.
- Assignment and automatic status changes produce separate Activity entries so each field change remains explicit and auditable.
- Card ordering is meaningful only within a status column. Moving between columns is a workflow transition; moving within a column is prioritization/order management.

### Identity and permission assumptions

- Alex Morgan is the only authenticated persona in this prototype. Role switching demonstrates permission differences without pretending to be another user.
- Alex is also the sole manager. All notes, activity, audit events, and self-assignment actions therefore identify Alex.
- Jamie Chen, Priya Patel, and Sam Rivera represent assignable employees only; they do not sign in or perform actions.
- Employee mode supports personal execution: Alex can create, self-assign, update, and comment only within the approved ownership and workflow rules.
- Manager mode supports coordination: assignment, reassignment, workflow oversight, card ordering, demo loading, audit review, and reset are manager capabilities.
- Reordering is manager-only because ordering the shared queue is treated as a coordination decision rather than an individual preference.
- The UI enforces prototype permissions for demonstration, but client-side controls are not a security boundary.

### Interaction and device assumptions

- The primary evaluation environment is a current Chrome or Edge browser on a 1920×1080 desktop or 1024×600 landscape Windows tablet.
- Manufacturing-floor use benefits from large touch targets, compact information density, restrained high contrast, readable timestamps, persistent Help, and text/icon cues rather than colour alone.
- At the supported 1024 px landscape width, all five Active or four Closed columns should fit simultaneously. Narrower devices may use horizontal scrolling as a fallback.
- Cards retain their full information at compact widths because quick scanning is more valuable than a reduced-content mobile card.
- Selecting a card opens Details. Moving it requires the separate labelled handle so tap-to-open and drag gestures do not compete.
- Drag activation uses an 8 px movement threshold to reduce accidental drags. Keyboard movement uses Space, arrow keys, and Escape.
- Drag-and-drop is the sole card-ordering control; arrow buttons are intentionally omitted because they can be mistaken for priority changes.
- Rejected drops display an explanatory toast and temporarily highlight the blocked card so the user understands the applicable permission or workflow rule.
- Opportunity Details provides non-drag status actions so workflow changes do not depend on drag-and-drop.
- The selected Active or Closed header button identifies the current board. Separate board headings and authenticated subtitles are omitted to preserve vertical space.
- Header and filter controls remain permanently visible; there is no collapse mode.
- True browser fullscreen is used rather than an app-only visual approximation. If it is denied or unsupported, the app explains the failure and leaves the layout unchanged.
- Empty and no-match states retain every column so the board's workflow structure remains visible and stable.

### Data and demonstration assumptions

- The first launch is empty so evaluators can experience opportunity creation before loading examples.
- **Load sample data** is additive and stable-keyed. It does not replace user-created records or duplicate samples already loaded.
- Demo data supplies at least two records in every active and terminal status so board density and all states can be evaluated.
- **Clear all data** is intentionally comprehensive: it removes opportunities, ordering, filters, preferences, and all audit events, including the clear action itself, then returns to first-launch state.
- Persisted prototype actions incorrectly attributed to Jamie Chen are migrated to Alex Morgan because Jamie was never a signed-in actor.
- Data is scoped to the current browser profile. It is not shared between browsers, devices, or users.

### Technical prototype assumptions

- A frontend-only single-page application is sufficient to demonstrate the requested workflow, interaction design, accessibility, and persistence behavior.
- `localStorage` is sufficient for demo persistence. A versioned schema supports migration and corrupted/incompatible data recovery.
- If persistent storage is unavailable, temporary in-memory operation is preferable to making the prototype unusable; the application announces that fallback.
- Storage-capacity failures preserve the current in-memory session rather than discarding work.
- Fixed credentials and role controls are explicitly demonstrative. Production authentication, server authorization, shared persistence, and server-retained audit history are outside prototype scope.
- Current Chrome and Edge on landscape Windows devices define the supported evaluation target; broader browser and device certification is deferred.
- GitHub Actions and Playwright are the merge quality gates. Netlify deploy previews support review, and `main` is the production branch.

## Data and recovery behavior

The application stores versioned state in browser `localStorage`. If storage is unavailable, it announces temporary-memory mode. Corrupted or incompatible stored data presents a recovery action. Storage-capacity failures preserve the current in-memory session; clearing application data or browser site data allows persistence to be retried.

Sample loading and reset behavior are deliberately different:

- **Load sample data** adds deduplicated examples without replacing user-created opportunities.
- **Clear all data** atomically removes opportunities, ordering, filters, preferences, and every audit event, then restores the welcome experience.

## Architecture and technology choices

| Area                     | Choice                                  | Rationale                                                  |
| ------------------------ | --------------------------------------- | ---------------------------------------------------------- |
| Application              | React, TypeScript, Vite                 | Compact, strictly typed SPA toolchain                      |
| UI                       | Material UI                             | Consistent, accessible interaction primitives              |
| Drag-and-drop            | dnd-kit                                 | Pointer, touch, and keyboard movement                      |
| Persistence              | `localStorage`                          | Browser-scoped demo persistence without a backend          |
| Unit/integration testing | Vitest, React Testing Library, jest-axe | Domain, component, interaction, and accessibility coverage |
| Browser testing          | Playwright                              | Critical evaluator and recovery journeys                   |
| Continuous integration   | GitHub Actions                          | Reproducible quality and browser gates                     |
| Hosting                  | Netlify                                 | Git-connected production hosting and deploy previews       |

### Project structure

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

## Run locally

Requirements: Node.js 24.14.0 (pinned in `.node-version` and `.nvmrc`) and npm 11 or later.

```bash
npm ci
npm run dev
```

Vite serves the application from the site root, so `base` remains `/`.

## Testing and quality gates

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

Coverage output is written to `coverage/`; Playwright's report is written to `playwright-report/`. GitHub Actions runs quality and E2E jobs for pull requests and pushes to `main`, and retains the Playwright report when the browser job runs.

### Test-driven delivery

Features are developed red–green–refactor: an approved requirement becomes a failing domain, integration, accessibility, or browser test; the minimum implementation makes it pass; and the code is refactored behind the retained regression test. Approved requirement changes are represented in tests before behavior changes.

The test pyramid consists of Vitest domain units, React Testing Library integration tests, jest-axe accessibility assertions, and Playwright evaluator journeys. After `npm ci`, the scripts above reproduce individual gates; `npm run check`, `npm run test:coverage`, and `npm run test:e2e` reproduce the complete local quality suite.

## Deployment

Netlify is connected to the public repository with:

- **Production branch:** `main`
- **Build command:** `npm ci && npm run build`
- **Publish directory:** `dist`
- **Deploy previews:** enabled for pull requests
- **Node version:** 24.14.0 from `netlify.toml`

The committed `netlify.toml` applies security headers and rewrites `/*` to `/index.html` with status 200 for SPA navigation. No environment variables are required. If secrets are introduced later, they must be configured in the hosting environment rather than committed.

Production publication is merge-gated: GitHub quality and Playwright checks must pass before an approved merge to `main`, after which Netlify deploys automatically. Deploy previews support review but do not replace CI or approval. The post-deployment workflow can run the critical Playwright journey against the public URL. If a smoke check fails, the previous successful Netlify deploy is the rollback point while the failure is investigated.

## Prototype boundaries

The following are intentional limitations, not undisclosed production capabilities:

- Fixed credentials and Manager mode are client-side demonstrations, not security controls.
- Data exists only in the current browser profile and is not multi-user or server-backed.
- Application audit history is browser-local and is intentionally removed by Clear all.
- Attachments, reporting, import/export, offline/PWA support, and a notification centre are not implemented.
- The prototype targets current Chrome and Edge on landscape Windows devices; broader browser/device certification is outside scope.

Before operational use, the product would require real authentication and authorization, an API and database, multi-user collaboration, server-retained audit history, a production security/privacy review, and any selected enhancements such as attachments, reporting/export, offline support, and notifications.

## AI-assisted development statement

AI assistance helped structure requirements, identify ambiguities, propose test cases, draft code, and execute validation. Human decisions remained authoritative: scope and requirement changes were explicitly approved, source documents were reconciled before implementation, tests were retained as regression evidence, CI gated merges, and the deployed result was reviewed between phases.

## Submission checklist

- [ ] Live demo loads at the public URL.
- [ ] Public repository is accessible.
- [ ] GitHub quality and Playwright checks are green.
- [ ] Demo credentials are visible and work.
- [ ] Evaluator walkthrough completes in a clean browser profile.
- [ ] Persistence and one critical workflow pass against production.
- [ ] Current Chrome and Edge smoke checks are recorded.
- [ ] README, in-app Help, limitations, assumptions, and security warning are accurate.
