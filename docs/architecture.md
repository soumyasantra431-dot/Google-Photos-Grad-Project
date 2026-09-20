# Photo Recall Discovery Engine — Foundation Architecture

## Goal

Build an evidence-traceable system that helps a product manager understand why people fail to
retrieve a specific visual memory when they cannot precisely describe it.

The engine is not a generic review summariser. It must preserve the chain from source conversation
to coded behavior, retrieval breakdown, opportunity, and product outcome.

## Current foundation

The first deployable unit contains:

1. A React and TypeScript single-page interface.
2. A Cloudflare Worker API in the same deployment.
3. A D1 database in the APAC region with versioned migrations.
4. Separate tables for raw documents, extracted evidence, tags, and human audits.
5. Read-only, validated APIs for corpus health, statistics, and evidence inspection.
6. Required encrypted secrets for YouTube, Groq, and authenticated ingestion.

This creates a reversible, testable evidence chain from collection through AI extraction and
deterministic reporting.

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
- **Local Apple collector** reads public review feeds, removes reviewer identities, and submits a
  bounded batch because Apple blocks the feed from Cloudflare edge addresses.
- **Local Google support collector** re-fetches a small curated set of public thread pages,
  extracts original posts or explicitly selected replies, skips unknown page formats, and submits a bounded batch. Its
  HTML parser is source-specific and must be monitored for changes; it is not a general forum API.
- **D1** is the system of record for documents, evidence units, classifications, and audits.
- **Review queue** preserves screened Community candidates and AI rejection reasons so a human can
  recover relevant cases without lowering the global confidence threshold.
- **Groq** classifies and synthesizes; it does not invent or calculate dashboard totals.
- **Worker API** validates requests and queries bound Cloudflare services.
- **React interface** presents evidence, coverage, uncertainty, and opportunity comparisons.

## Research integrity rules

- Raw user language is stored separately from AI interpretation.
- Every admissible document has a canonical public source URL.
- Simulated fixtures use `is_simulated = 1` and `include_in_findings = 0`.
- Aggregate APIs exclude simulated and non-admissible evidence by default.
- Model name, schema version, extraction confidence, and human verification are retained.
- Corpus patterns are reported as evidence patterns, not population prevalence.

## Stage 2 acceptance criteria

- TypeScript type-check succeeds.
- Vite production build succeeds.
- Worker configuration validates during the build.
- `/api/health` confirms the D1 connection.
- Default evidence and aggregate APIs exclude simulated fixtures.
- An explicit test query can retrieve the simulated fixtures.
- The React interface renders live corpus totals from D1.
- `.dev.vars` and environment files are excluded from Git.
- No secret or synthetic research claim is presented as real evidence.

## Current collection quality

- YouTube is operational but low-yield for vague-memory retrieval.
- The first broad YouTube run produced eight deletion/recovery records; all were audited and
  excluded without deleting their provenance.
- A stricter YouTube run retained zero records rather than manufacturing relevance.
- The first Apple review run scanned 112 reviews and initially retained one record; human review
  found it was about wrong date metadata after a successful find, so it is excluded.
- The first support run fetched 11 original posts, analyzed 7, and initially retained 5. Human
  audit excluded 4 generic search complaints and corrected the one specific re-finding episode.
- A reply-focused run captured two specific user replies. The first pass exposed a false-positive
  deletion keyword filter; after a regression-tested correction, both were retained and audited.
- The first admitted corpus contained three human-reviewed Google Photos Community episodes.
  Two more source-reviewed replies were subsequently admitted: a name-search/face-indexing episode
  and an explicitly forgotten-date/map-browsing request. This is a purposive, small qualitative
  sample from one source family, not a prevalence estimate or opportunity ranking.
- Four deterministic question views separate photo target types, remembered clue types, explicitly
  forgotten context, and attempted or requested search methods. Unstated details are not coded as
  forgotten; exact typed queries are reported only when the user's words are available.

## Deferred

- Google Play and Reddit connectors, subject to viable access and platform terms.
- Scheduled execution through a remote-compatible source or approved workflow runner.
- R2 raw-payload archive if source payload volume requires it.
- Vectorize semantic retrieval after the evidence corpus is large enough to justify it.
