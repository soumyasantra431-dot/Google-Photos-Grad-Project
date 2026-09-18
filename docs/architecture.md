# Photo Recall Discovery Engine — Foundation Architecture

## Goal

Build an evidence-traceable system that helps a product manager understand why people fail to
retrieve a specific visual memory when they cannot precisely describe it.

The engine is not a generic review summariser. It must preserve the chain from source conversation
to coded behavior, retrieval breakdown, opportunity, and product outcome.

## Foundation decision

The first deployable unit contains:

1. A React and TypeScript single-page interface.
2. A Cloudflare Worker API in the same deployment.
3. A health endpoint that proves frontend-to-Worker communication.
4. No production data, external API key, or AI dependency.

This establishes a reversible, testable base before stateful services are provisioned.

## Planned evidence flow

```text
Public APIs and auditable imports
              |
              v
       Source normalization
              |
              v
   Raw evidence + provenance in D1
              |
              v
  Groq relevance and structured coding
              |
              v
 Deterministic aggregates + human audit
              |
              v
 Evidence Explorer and cited Q&A
```

## Responsibility boundaries

- **Source connectors** collect only public, permitted material and preserve canonical URLs.
- **D1** is the system of record for documents, evidence units, classifications, and audits.
- **Groq** classifies and synthesizes; it does not invent or calculate dashboard totals.
- **Worker API** validates requests and queries bound Cloudflare services.
- **React interface** presents evidence, coverage, uncertainty, and opportunity comparisons.

## Deferred until the foundation passes

- D1 database and migrations.
- R2 raw-payload archive.
- Queues and scheduled collection.
- Groq secret and model integration.
- YouTube and Reddit credentials.
- Vectorize semantic retrieval.
- Public production deployment.

## Foundation acceptance criteria

- TypeScript type-check succeeds.
- Vite production build succeeds.
- Worker configuration validates during the build.
- `/api/health` returns structured JSON.
- The React interface renders a clear foundation state.
- `.dev.vars` and environment files are excluded from Git.
- No secret or synthetic research claim exists in the repository.

