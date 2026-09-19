# Photo Recall Discovery Engine

An AI-powered, evidence-traceable research system for understanding why people fail to retrieve
specific photos when their memory is incomplete.

## Current stage

Stage 3 adds authenticated YouTube collection, local Apple App Store and curated Google Photos
Community collectors, Groq structured extraction, scope guardrails, and a live evidence explorer. Raw source language remains
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
- `pnpm.cmd run collect:google-support -- --dry-run` checks a bounded list of public thread pages
  without writing data. `pnpm.cmd run collect:google-support` sends original posts and selected
  user replies to the same protected evidence pipeline; `--replies-only` limits a run to replies.
  A page that changes format is skipped, not guessed.
- The Google Play Developer API grants review access for the developer's own apps, not a public
  feed for arbitrary apps; a Google Play connector needs an explicitly assessed source path.
- Provider credentials and the collection trigger token are declared as required Cloudflare
  secrets and never stored in source control.

## Secrets

For local Worker development, copy `.dev.vars.example` to `.dev.vars` and add values locally. Never
commit `.dev.vars`, `.env`, API keys, or tokens.

## Architecture

See [docs/architecture.md](docs/architecture.md) for the staged system design.
