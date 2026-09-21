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
5. Read-only, validated APIs for corpus health, statistics, evidence inspection, and bounded AI synthesis.
6. Corpus-versioned D1 snapshots so repeated public questions do not repeatedly spend LLM tokens.
7. Required encrypted secrets for YouTube, Groq, and authenticated ingestion.

This creates a reversible, testable evidence chain from collection through AI extraction and
deterministic reporting.

## Evidence flow

```text
Public API, feed, page, and verified-excerpt imports
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
 Whitelisted Groq synthesis + citation validation
              |
              v
 Visual comparison, evidence drawer, and cited Q&A
```

## Responsibility boundaries

- **Source connectors** collect only public, permitted material and preserve canonical URLs.
- **Local Apple collector** reads public review feeds, removes reviewer identities, and submits a
  bounded batch because Apple blocks the feed from Cloudflare edge addresses.
- **Local Google support collector** re-fetches a small curated set of public thread pages,
  extracts original posts or explicitly selected replies, skips unknown page formats, and submits a bounded batch. Its
  HTML parser is source-specific and must be monitored for changes; it is not a general forum API.
- **D1** is the system of record for documents, evidence units, classifications, and audits.
- **Verified-excerpt import** accepts small source-linked excerpts from public Reddit, forum, or
  social posts. It is a manual curation pathway, not a bulk Reddit or social-media API connector.
- **Review queue** preserves candidates and AI rejection reasons so a human can inspect omissions
  without lowering the global confidence threshold. Reviewed evidence is frozen on repeat ingestion.
- **Groq** classifies and synthesizes; it does not invent or calculate dashboard totals.
- **Grounded-analysis templates** limit the public LLM surface to six research questions. D1 supplies
  fixed counts and human-checked excerpts; every generated insight must return a valid evidence ID.
- **Analysis snapshots** cache valid Groq output against a corpus signature. A changed evidence,
  audit, or opportunity-coding timestamp causes a new synthesis instead of serving stale analysis.
- **Worker API** validates requests and queries bound Cloudflare services.
- **React interface** presents an evidence funnel, accessible donut summaries, question templates,
  source-linked AI answers, and one retrieval-problem comparison at a time.
- **Opportunity coding** is a separate human-reviewed table. It does not overwrite the raw source
  or Groq extraction, and it keeps uncoded episodes visible rather than assigning a mechanism by
  inference.

## Research integrity rules

- Raw user language is stored separately from AI interpretation.
- Every admissible document has a canonical public source URL.
- Simulated fixtures use `is_simulated = 1` and `include_in_findings = 0`.
- Aggregate APIs exclude simulated and non-admissible evidence by default.
- Model name, schema version, extraction confidence, and human verification are retained.
- Corpus patterns are reported as evidence patterns, not population prevalence.
- Percentages are labelled as shares of included stories; collection funnel percentages are not
  interpreted as problem incidence.
- Arbitrary public prompts are not accepted, preventing the Worker from becoming an unrestricted
  Groq proxy.

## Operational checks

- TypeScript type-check succeeds.
- Vite production build succeeds.
- Worker configuration validates during the build.
- `/api/health` confirms the D1 connection.
- Default evidence and aggregate APIs exclude simulated fixtures.
- An explicit test query can retrieve the simulated fixtures.
- The React interface renders live corpus totals from D1.
- Every grounded-analysis template returns at least one validated source citation from the current
  corpus, and repeated requests use the D1 snapshot.
- `.dev.vars` and environment files are excluded from Git.
- No secret or synthetic research claim is presented as real evidence.

## Current collection quality

- Google Photos Community has the richest product-specific retrieval episodes, but search-engine
  seeded pages are not a random sample. The collector archives both in-scope and rejected posts.
- Apple public review feeds provide broad coverage across three storefronts, but general app
  reviews rarely describe a particular sought photo, remembered clue, and attempted search.
- Reddit's verified-excerpt path adds concrete first-person cases and diverse workarounds; it is
  purposive and small. Short excerpts can omit context, so human reviewers consult the linked post
  before correcting any AI labels. The original model output remains archived.
- YouTube comment sampling was operational but low-yield; earlier rejected comments were not all
  archived, so its candidate count is not comparable to the newer sources.
- Groq sometimes omits array items or rejects its own enum-constrained schema. The pipeline retries
  missing items, uses shape-constrained output, drops unrecognized code values, and keeps source
  quotes and human audit separate. A failed batch is recorded rather than silently counted.
- Four deterministic question views separate photo target types, remembered clue types, explicitly
  forgotten context, and attempted or requested search methods. Unstated details are not coded as
  forgotten; exact typed queries are reported only when the user's words are available.
- The product-outcome view compares five mechanisms: clue expression, clue interpretation, result
  evaluation, search refinement, and library access. Counts, source diversity, unresolved outcomes,
  workarounds, and human-review coverage are shown independently. “Most observed” is explicitly a
  selected-corpus signal, not a RICE score, prevalence estimate, or final opportunity decision.
- The problem-definition view converts the leading observed mechanism into a provisional behavioral
  segment, retrieval moment, root cause, outcome, and validation gaps. It is a focus to test, not a
  market-sized conclusion or final solution decision.

## Deferred

- Google Play and automated Reddit/social/forum connectors, subject to viable access and platform
  terms. The existing Reddit path only handles manually verified short excerpts.
- Scheduled execution through a remote-compatible source or approved workflow runner.
- R2 raw-payload archive if source payload volume requires it.
- Vectorize semantic retrieval after the evidence corpus is large enough to justify it.
