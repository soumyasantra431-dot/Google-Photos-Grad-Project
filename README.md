# Photo Recall Discovery Engine

An AI-powered, evidence-traceable research system for understanding why people fail to retrieve
specific photos when their memory is incomplete.

## Current stage

The current build combines authenticated YouTube collection, local Apple App Store and Google
Photos Community collectors, and a verified-excerpt pathway for public Reddit/forum/social posts.
Groq codes retrieval episodes and powers six bounded, evidence-grounded research templates; the
Worker calculates question-led aggregates from D1. Raw source language, model output, and human
corrections remain separate. AI answers are cached by corpus version, must cite supplied evidence
IDs, and link back to the public source. Rejected or simulated material is excluded from findings.
The admitted corpus is a small, purposively sampled qualitative set, not a population-prevalence
estimate or proof of current product behavior for every user.

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
- `GET /api/evidence.csv` downloads the included, source-linked evidence in an Excel-friendly CSV.
- `GET /api/evidence/:id` returns a traceable evidence record and its source text.
- `GET /api/evidence?includeSimulated=true` is an explicit test-only view.
- `GET /api/research-questions` answers the four required questions with coded episode counts,
  source links, exact-query availability, and explicit unknowns.
- `GET /api/opportunity-map` decomposes retrieval into clue expression, clue interpretation,
  result evaluation, search refinement, and library access. It compares evidence strength and
  connects each mechanism to a product outcome, leading metric, and diagnostics without inventing
  a market-size or prioritization score.
- `GET /api/problem-definition` turns the leading observed breakdown into a provisional target
  segment, retrieval scenario, root cause, product outcome, and explicit validation gaps.
- `GET /api/source-coverage` distinguishes source families attempted from evidence admitted.
- `GET /api/analysis-templates` lists the six allowed public research questions.
- `GET /api/grounded-analysis?template=photo_types` returns a cached or newly generated Groq
  synthesis with validated evidence IDs, public citations, model provenance, and an explicit
  limitation. Allowed template IDs are `photo_types`, `remembered_clues`, `forgotten_context`,
  `search_language`, `compare_breakdowns`, and `choose_opportunity`; arbitrary prompts are rejected.

Optional filters are `failureStage`, `sourceKind`, and `limit` (1-50).

## Collection

- YouTube collection runs inside the Worker through a token-protected endpoint.
- Apple blocks its public review feed from Cloudflare edge addresses, so `pnpm.cmd run
  collect:app-store` fetches the public feed locally and sends a bounded, de-identified batch to
  the authenticated ingestion endpoint. The collector currently checks up to ten pages each for
  the US, UK, and India storefronts, deduplicates by storefront and review ID, and archives
  screening decisions. Apple feed URLs identify a feed page, not a durable individual-review link.
- `pnpm.cmd run collect:google-support -- --dry-run` checks a bounded list of public thread pages
  without writing data. `pnpm.cmd run collect:google-support` sends original posts and selected
  user replies to the same protected evidence pipeline; `--replies-only` limits a run to replies,
  and `--batch2-only`, `--batch3-only`, or `--start-batch=N` can resume the source-seed batches. Seed URLs are in
  `research/source-seeds/`. A page that changes format is skipped, not guessed.
- `pnpm.cmd run ingest:curated research/source-seeds/curated-reddit-2026-09-20.json` submits a small
  manually verified set of public, source-linked excerpts (at most 25 words each) through the
  same authenticated screening pipeline. This is not a Reddit API or bulk scraping connector;
  forum and social sources use the same format only after their excerpts are verified.
- The Google Play Developer API grants review access for the developer's own apps, not a public
  feed for arbitrary apps; a Google Play connector needs an explicitly assessed source path.
- Provider credentials and the collection trigger token are declared as required Cloudflare
  secrets and never stored in source control.
- Screened candidates and decisions are preserved in `review_candidates` for manual audit. The
  human-coded corrections and exclusions are recorded in `research/audits/`; these are never
  presented as unedited Groq outputs. A repeat ingestion does not replace a reviewed evidence unit.

## Known gaps

Google Play and social collection are not yet connected. Forum coverage is a small, researcher-curated
set of Google-Photos-specific public discussions, not a general forum firehose. Public App Store review
volume should not be mistaken for relevant retrieval episodes. Public complaints are self-selected
and cannot establish how common a failure is. More target-specific source discovery and 5–6 real
interviews are still needed before choosing and validating a product opportunity; simulated
interviews must never be presented as primary research.

## Primary research

The engine also exposes a separate anonymous survey layer at `/api/primary-research`. The current
instrument has eight convenience-sample responses, including seven recent retrieval attempts. Only
anonymized structured coding is stored in `research/primary-research/`; names, emails, submission
timestamps, response tokens, and raw free-text answers are not published. Survey counts are never
merged into the public-evidence corpus or its percentages, and incomplete or inconsistent responses
remain visibly flagged.

## Secrets

For local Worker development, copy `.dev.vars.example` to `.dev.vars` and add values locally. Never
commit `.dev.vars`, `.env`, API keys, or tokens.

## Architecture

See [docs/architecture.md](docs/architecture.md) for the staged system design.
