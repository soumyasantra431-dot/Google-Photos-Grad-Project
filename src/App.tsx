import { useEffect, useState } from "react";

type CorpusStats = {
  source_count: number;
  document_count: number;
  evidence_count: number;
  verified_count: number;
};

type Evidence = {
  id: string;
  retrieval_target: string;
  evidence_excerpt: string;
  remembered_clues_json: string;
  forgotten_context_json: string;
  search_attempt: string | null;
  failure_stage: string;
  retrieval_outcome: string;
  extraction_confidence: number;
  model_name: string;
  is_human_verified: number;
  audit_verdict: string | null;
  audit_notes: string | null;
  source_kind: string;
  platform: string;
  canonical_url: string;
  published_at: string | null;
};

type CollectionRun = {
  id: string;
  source_kind: string;
  status: string;
  records_seen: number;
  records_stored: number;
  completed_at: string | null;
};

type Breakdown = { source_kind?: string; failure_stage?: string; evidence_count: number };

type ResearchQuestions = {
  coverage: { admittedEpisodes: number; codedEpisodes: number; humanVerifiedEpisodes: number; sourceKinds: string[]; truncated: boolean };
  questions: Array<{
    id: string;
    question: string;
    caveat: string;
    observedEpisodes: number;
    evidenceState: "not_observed" | "early_directional" | "multi_source_directional";
    patterns: Array<{
      code: string;
      episodes: number;
      examples: Array<{ id: string; source_text: string; canonical_url: string; source_kind: string }>;
    }>;
    reportedExactQueries?: Array<{ query: string; id: string; canonical_url: string }>;
  }>;
};

type SourceCoverage = {
  sources: Array<{
    sourceKind: string;
    status: "attempted" | "not_connected";
    runCount: number;
    recordsProcessedAcrossRuns: number;
    initiallyRetainedAcrossRuns: number;
    admittedEpisodes: number;
  }>;
  note: string;
};

type SystemState =
  | { kind: "loading" }
  | {
      kind: "online";
      checkedAt: string;
      corpus: CorpusStats;
      simulatedExcluded: number;
      publicExcluded: number;
      evidence: Evidence[];
      runs: CollectionRun[];
      bySource: Breakdown[];
      byFailureStage: Breakdown[];
      research: ResearchQuestions;
      sourceCoverage: SourceCoverage;
    }
  | { kind: "offline" };

const stages = [
  { number: "01", title: "Collect evidence", description: "Bring public conversations into one traceable research corpus." },
  { number: "02", title: "Structure memory clues", description: "Separate what people remember, forget, try, and experience." },
  { number: "03", title: "Compare breakdowns", description: "Find where expression, interpretation, evaluation, or recovery fails." },
  { number: "04", title: "Prioritise an opportunity", description: "Connect evidence to a focused product outcome and validation plan." },
];

const emptyStats: CorpusStats = { source_count: 0, document_count: 0, evidence_count: 0, verified_count: 0 };

function parseStringArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function friendlyLabel(value: string): string {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function App() {
  const [system, setSystem] = useState<SystemState>({ kind: "loading" });

  useEffect(() => {
    const controller = new AbortController();

    async function loadSystem() {
      try {
        const [healthResponse, statsResponse, evidenceResponse, runsResponse, researchResponse, coverageResponse] = await Promise.all([
          fetch("/api/health", { signal: controller.signal }),
          fetch("/api/stats", { signal: controller.signal }),
          fetch("/api/evidence?limit=12", { signal: controller.signal }),
          fetch("/api/collection-runs", { signal: controller.signal }),
          fetch("/api/research-questions", { signal: controller.signal }),
          fetch("/api/source-coverage", { signal: controller.signal }),
        ]);
        if (![healthResponse, statsResponse, evidenceResponse, runsResponse, researchResponse, coverageResponse].every((response) => response.ok)) {
          throw new Error("System check failed");
        }

        const health = (await healthResponse.json()) as { checkedAt: string; database: string };
        const stats = (await statsResponse.json()) as {
          corpus?: CorpusStats;
          simulatedEvidenceExcluded?: number;
          publicEvidenceExcluded?: number;
          bySource?: Breakdown[];
          byFailureStage?: Breakdown[];
        };
        const evidence = (await evidenceResponse.json()) as { data?: Evidence[] };
        const runs = (await runsResponse.json()) as { data?: CollectionRun[] };
        const research = (await researchResponse.json()) as ResearchQuestions;
        const sourceCoverage = (await coverageResponse.json()) as SourceCoverage;
        if (health.database !== "connected") throw new Error("Database unavailable");

        setSystem({
          kind: "online",
          checkedAt: health.checkedAt,
          corpus: stats.corpus ?? emptyStats,
          simulatedExcluded: stats.simulatedEvidenceExcluded ?? 0,
          publicExcluded: stats.publicEvidenceExcluded ?? 0,
          evidence: evidence.data ?? [],
          runs: (runs.data ?? []).filter((run) => run.status === "completed").slice(0, 4),
          bySource: stats.bySource ?? [],
          byFailureStage: stats.byFailureStage ?? [],
          research,
          sourceCoverage,
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setSystem({ kind: "offline" });
      }
    }

    void loadSystem();
    return () => controller.abort();
  }, []);

  const corpus = system.kind === "online" ? system.corpus : emptyStats;
  const evidence = system.kind === "online" ? system.evidence : [];
  const runs = system.kind === "online" ? system.runs : [];

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Photo Recall home">
          <span className="brand-mark" aria-hidden="true">
            <span className="petal petal-blue" />
            <span className="petal petal-red" />
            <span className="petal petal-yellow" />
            <span className="petal petal-green" />
          </span>
          <span>Photo Recall Lab</span>
        </a>
        <div className={`status status-${system.kind}`} aria-live="polite">
          <span className="status-dot" />
          {system.kind === "loading" && "Checking discovery engine"}
          {system.kind === "online" && "Discovery engine online"}
          {system.kind === "offline" && "Discovery engine unavailable"}
        </div>
      </header>

      <main id="top">
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">AI-powered product discovery</p>
            <h1>Understand why remembered photos still feel impossible to find.</h1>
            <p className="hero-intro">
              A research system for turning public conversations into traceable evidence about
              vague-memory photo retrieval—not another generic sentiment dashboard.
            </p>
            <div className="hero-actions">
              <a className="button button-primary" href="#research-questions">Explore the four research questions</a>
              <span className="build-label">Live source collection and evidence coding</span>
            </div>
          </div>

          <div className="memory-card" aria-label="Example memory clues">
            <div className="memory-card-header">
              <span className="memory-icon" aria-hidden="true">?</span>
              <span>A half-remembered moment</span>
            </div>
            <blockquote>“That tiny café from our Goa trip—the one with blue chairs.”</blockquote>
            <div className="clue-list">
              <span>Place · Goa</span><span>Object · blue chairs</span><span>Context · trip</span>
              <span className="clue-missing">Forgotten · exact date</span>
            </div>
          </div>
        </section>

        {system.kind === "online" && (
          <section className="research-questions" id="research-questions">
            <div className="section-heading">
              <p className="eyebrow">Question-led findings</p>
              <h2>The four questions are answered from coded episodes, with uncertainty visible.</h2>
              <p>
                {system.research.coverage.codedEpisodes} coded of {system.research.coverage.admittedEpisodes} admitted episodes · {system.research.coverage.humanVerifiedEpisodes} human verified · {system.research.coverage.sourceKinds.length} {system.research.coverage.sourceKinds.length === 1 ? "source type" : "source types"}. Counts describe this selected corpus, not all Google Photos users.
              </p>
              {system.research.coverage.truncated && <p>Only the first 1,000 admitted episodes are included in these findings; refine the corpus before interpreting counts.</p>}
            </div>
            <div className="question-grid">
              {system.research.questions.map((finding, index) => (
                <article className="question-card" key={finding.id}>
                  <div className="question-topline"><span>QUESTION {index + 1}</span><span>{finding.evidenceState === "not_observed" ? "Not observed" : finding.evidenceState === "early_directional" ? "Early, directional" : "Multi-source, directional"}</span></div>
                  <h3>{finding.question}</h3>
                  <p className="question-count">{finding.observedEpisodes} of {system.research.coverage.codedEpisodes} coded episodes contain an explicit signal</p>
                  {finding.patterns.length > 0 ? (
                    <div className="pattern-list">
                      {finding.patterns.slice(0, 5).map((pattern) => (
                        <details key={pattern.code}>
                          <summary><span>{friendlyLabel(pattern.code)}</span><strong>{pattern.episodes} {pattern.episodes === 1 ? "episode" : "episodes"}</strong></summary>
                          {pattern.examples.map((example) => (
                            <p key={example.id}>“{example.source_text}” <a href={example.canonical_url} target="_blank" rel="noreferrer">Source ↗</a></p>
                          ))}
                        </details>
                      ))}
                    </div>
                  ) : <p className="question-unknown">{finding.id === "forgotten" ? "The current admitted posts do not explicitly state a memory gap. An unstated detail is not treated as forgotten." : "The current admitted posts do not establish a specific pattern for this question."}</p>}
                  {finding.id === "searches" && <p className="exact-query-note">Exact user-reported queries: {finding.reportedExactQueries?.length ? finding.reportedExactQueries.map((item) => `“${item.query}”`).join(", ") : "none in the current corpus"}.</p>}
                  <p className="question-caveat">{finding.caveat}</p>
                </article>
              ))}
            </div>
          </section>
        )}

        <section className="principle-strip" aria-label="Research principles">
          <div><strong>Evidence first</strong><span>Every finding traces back to a public source.</span></div>
          <div><strong>Beyond sentiment</strong><span>We code memory, behavior, failure, and workaround.</span></div>
          <div><strong>Honest confidence</strong><span>Corpus patterns are not population prevalence.</span></div>
        </section>

        <section className="evidence-foundation" id="evidence">
          <div className="section-heading">
            <p className="eyebrow">Live research corpus</p>
            <h2>Only evidence that survives relevance and provenance checks reaches the corpus.</h2>
            <p>Counts update from D1 and exclude simulations and public records rejected during scope review.</p>
          </div>

          <div className="metric-grid" aria-live="polite">
            <article className="metric-card"><span>Admitted source URLs</span><strong>{corpus.source_count}</strong><small>One public link per episode</small></article>
            <article className="metric-card"><span>Admitted conversations</span><strong>{corpus.document_count}</strong><small>Original language preserved</small></article>
            <article className="metric-card"><span>Evidence units</span><strong>{corpus.evidence_count}</strong><small>Structured retrieval episodes</small></article>
            <article className="metric-card"><span>Human verified</span><strong>{corpus.verified_count}</strong><small>Coding reviewed against source</small></article>
          </div>

          <div className="integrity-note">
            <span className="integrity-icon" aria-hidden="true">✓</span>
            <div>
              <strong>Research-integrity guardrail active</strong>
              <p>
                {system.kind === "online" ? system.publicExcluded : 0} out-of-scope public records and {system.kind === "online" ? system.simulatedExcluded : 0} illustrative records are excluded from findings.
              </p>
            </div>
          </div>
        </section>

        {system.kind === "online" && (
          <section className="coverage-section" id="source-coverage">
            <div className="section-heading">
              <p className="eyebrow">Source coverage</p>
              <h2>Seven requested source families; collection and admitted evidence are different.</h2>
              <p>Attempted means a collector has run, not that it produced relevant evidence. Missing platforms remain visible.</p>
            </div>
            <div className="coverage-list">
              {system.sourceCoverage.sources.map((source) => (
                <div className="coverage-row" key={source.sourceKind}>
                  <strong>{friendlyLabel(source.sourceKind)}</strong>
                  <span>{source.status === "attempted" ? `${source.runCount} runs` : "Not connected"}</span>
                  <span>{source.admittedEpisodes} admitted {source.admittedEpisodes === 1 ? "episode" : "episodes"}</span>
                </div>
              ))}
            </div>
            <p className="coverage-note">{system.sourceCoverage.note} Public discussion volume is not a population estimate.</p>
          </section>
        )}

        <section className="explorer" id="explorer">
          <div className="section-heading">
            <p className="eyebrow">Evidence explorer</p>
            <h2>See the user’s words before accepting the AI’s interpretation.</h2>
            <p>Every card pairs an exact source excerpt with structured memory clues and a direct source link.</p>
          </div>

          {evidence.length > 0 ? (
            <div className="evidence-grid">
              {evidence.map((item) => {
                const clues = parseStringArray(item.remembered_clues_json);
                const forgotten = parseStringArray(item.forgotten_context_json);
                return (
                  <article className="evidence-card" key={item.id}>
                    <div className="evidence-meta">
                      <span>{item.platform}</span>
                      <span>{item.is_human_verified ? "Human reviewed" : "Awaiting human review"}</span>
                    </div>
                    <blockquote>“{item.evidence_excerpt}”</blockquote>
                    <h3>{item.retrieval_target}</h3>
                    <div className="evidence-tags">
                      {clues.map((clue) => <span key={`clue-${clue}`}>Remembered · {clue}</span>)}
                      {forgotten.map((detail) => <span className="tag-forgotten" key={`forgotten-${detail}`}>Forgotten · {detail}</span>)}
                    </div>
                    <div className="evidence-footer">
                      <span>{friendlyLabel(item.failure_stage)} · {friendlyLabel(item.retrieval_outcome)}</span>
                      <a href={item.canonical_url} target="_blank" rel="noreferrer">Open source ↗</a>
                    </div>
                    {item.audit_notes && (
                      <details className="audit-detail">
                        <summary>Why this evidence was retained</summary>
                        <p>{item.audit_notes}</p>
                        <small>{item.model_name === "human_source_coding" ? "Human-coded after no valid model output" : `AI extraction confidence before review: ${Math.round(item.extraction_confidence * 100)}%`} · Audit: {friendlyLabel(item.audit_verdict ?? "unknown")}</small>
                      </details>
                    )}
                  </article>
                );
              })}
            </div>
          ) : <p className="empty-state">No admissible evidence has been retained yet.</p>}
        </section>

        <section className="runs-section">
          <div className="section-heading">
            <p className="eyebrow">Collection diagnostics</p>
            <h2>Low yield is visible instead of being disguised as insight.</h2>
            <p>Completed runs show how much material was scanned and how little met the research definition.</p>
          </div>
          <div className="run-list">
            {runs.map((run) => (
              <div className="run-row" key={run.id}>
                <div><strong>{friendlyLabel(run.source_kind)}</strong><span>{run.completed_at ? new Date(run.completed_at).toLocaleString() : "In progress"}</span></div>
                <div><strong>{run.records_seen}</strong><span>scanned</span></div>
                <div><strong>{run.records_stored}</strong><span>initially retained</span></div>
              </div>
            ))}
          </div>
        </section>

        <section className="architecture" id="architecture">
          <div className="section-heading">
            <p className="eyebrow">Evidence chain</p>
            <h2>One auditable path from public conversation to product opportunity</h2>
            <p>Raw source text stays separate from Groq interpretation; deterministic APIs calculate coverage and breakdowns.</p>
          </div>
          <div className="stage-grid">
            {stages.map((stage) => <article className="stage-card" key={stage.number}><span className="stage-number">{stage.number}</span><h3>{stage.title}</h3><p>{stage.description}</p></article>)}
          </div>
        </section>

        <section className="next-step">
          <div><p className="eyebrow">Next implementation gate</p><h2>Broaden evidence before defining the opportunity.</h2></div>
          <p>Expand beyond the first support-community sample, then human-audit evidence across sources before comparing failure stages.</p>
        </section>
      </main>

      <footer>
        <span>Photo Recall Discovery Engine</span>
        <span>{system.kind === "online" ? `Database checked ${new Date(system.checkedAt).toLocaleTimeString()}` : "Evidence system"}</span>
      </footer>
    </div>
  );
}

export default App;
