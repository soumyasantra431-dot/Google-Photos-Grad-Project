# Photo Recall Discovery Engine

An AI-powered, evidence-traceable research system for understanding why people fail to retrieve
specific photos when their memory is incomplete.

## Current stage

Stage 2 adds a Cloudflare D1 evidence system with provenance, extraction, tagging, and audit
tables. Three simulated fixtures validate the pipeline and are excluded from findings by default.
No AI secret is required yet.

## Local setup

```powershell
pnpm.cmd install
pnpm.cmd run db:migrate:local
pnpm.cmd run dev
```

## Validation

```powershell
pnpm.cmd run check
pnpm.cmd run build
```

## Deployment

```powershell
pnpm.cmd run deploy
```

The deployment script builds the React and Worker environments, then deploys the generated
Wrangler configuration so both the API and static interface are published together.

## Read-only API

- `GET /api/health` checks the Worker and D1 binding.
- `GET /api/stats` returns admissible corpus totals and coverage breakdowns.
- `GET /api/evidence` lists only real, included evidence by default.
- `GET /api/evidence/:id` returns a traceable evidence record and its source text.
- `GET /api/evidence?includeSimulated=true` is an explicit test-only view.

Optional filters are `failureStage`, `sourceKind`, and `limit` (1–50).

## Secrets

When integrations begin, copy `.dev.vars.example` to `.dev.vars` and add values locally. Never
commit `.dev.vars`, `.env`, API keys, or tokens.

## Architecture

See [docs/architecture.md](docs/architecture.md) for the staged system design.
