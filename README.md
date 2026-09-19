# Photo Recall Discovery Engine

An AI-powered, evidence-traceable research system for understanding why people fail to retrieve
specific photos when their memory is incomplete.

## Current stage

Stage 3 adds authenticated YouTube collection, a local Apple App Store feed collector, Groq
structured extraction, scope guardrails, and a live evidence explorer. Raw source language remains
separate from AI interpretation, and rejected or simulated material is excluded from findings.

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

Optional filters are `failureStage`, `sourceKind`, and `limit` (1-50).

## Collection

- YouTube collection runs inside the Worker through a token-protected endpoint.
- Apple blocks its public review feed from Cloudflare edge addresses, so `pnpm.cmd run
  collect:app-store` fetches the public feed locally and sends a bounded, de-identified batch to
  the authenticated ingestion endpoint.
- Provider credentials and the collection trigger token are declared as required Cloudflare
  secrets and never stored in source control.

## Secrets

When integrations begin, copy `.dev.vars.example` to `.dev.vars` and add values locally. Never
commit `.dev.vars`, `.env`, API keys, or tokens.

## Architecture

See [docs/architecture.md](docs/architecture.md) for the staged system design.
