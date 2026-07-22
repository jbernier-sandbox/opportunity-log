# Opportunity Log

Opportunity Log is a frontend-only continuous-improvement workflow prototype built for a
touch-friendly shop-floor experience.

## Implementation status

Phase 0 established the tested application shell, strict TypeScript and linting,
unit/integration/accessibility and end-to-end test runners, GitHub Actions CI, and reproducible
Netlify build configuration. Phase 1 adds the typed opportunity domain, workflow and permission
rules, deterministic ordering, versioned browser persistence, corrupted-data recovery, storage
capacity handling, and temporary-memory fallback. User-facing features are added incrementally
using TDD.

## Requirements

- Node.js 24.14.0 (pinned in `.node-version` and `.nvmrc`)
- npm 11+
- Current Microsoft Edge or Google Chrome on Windows

## Local development

```bash
npm ci
npm run dev
```

## Quality checks

```bash
npm run check
npm run test:coverage
npm run test:e2e
```

Install the Playwright browser once before the first local end-to-end run:

```bash
npx playwright install chromium
```

Each feature follows red–green–refactor. Requirement changes must be approved before their
regression tests are changed.

## Netlify

The intended public site is `opportunity-log-demo` under the `jbernier-sandbox` Netlify account.
Connect the public GitHub repository and configure:

- Production branch: `main`
- Build command: `npm ci && npm run build`
- Publish directory: `dist`
- Deploy previews: enabled for every pull request

The same settings and Node version are committed in `netlify.toml`. Vite uses a root base path.
The application currently has no client-side routing, so no SPA fallback redirect is necessary.
Merges to `main` must be protected by the required GitHub Actions checks. Netlify deploy previews
are evaluation environments and do not replace CI approval.

The post-deployment workflow runs the Playwright smoke suite against successful production
deployments. It can also be started manually with a Netlify deployment URL. As features are added,
this suite will grow to cover login, persistence, and one critical opportunity workflow.

## Prototype limitations

This prototype will use browser storage and fixed frontend demo credentials. It is not production
authentication, has no backend, and must not contain sensitive information.
